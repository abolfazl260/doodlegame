package com.abolfazl.doodlegame;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.SystemClock;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.Semaphore;

/** Private numeric IPv4 on the directly attached Wi-Fi subnet only. No DNS or WAN fallback. */
@CapacitorPlugin(name = "DoodleLan")
public class DoodleLanPlugin extends Plugin {
    private static final int MAX_FRAME = 65536;
    private volatile ServerSocket server;
    private volatile Socket peer;
    private volatile Socket connecting;
    private volatile int generation;
    private volatile Wifi wifi;
    private long lastAccept;
    private volatile Semaphore bridgeBudget;
    private int connectionId;
    private final ThreadPoolExecutor writes = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(16), runnable -> { Thread t = new Thread(runnable, "DoodleLan-write"); t.setDaemon(true); return t; });

    private static final class Wifi {
        final Network network;
        final InetAddress address;
        final int prefix;
        Wifi(Network network, InetAddress address, int prefix) { this.network = network; this.address = address; this.prefix = prefix; }
        boolean contains(InetAddress other) {
            if (!(other instanceof Inet4Address) || !other.isSiteLocalAddress() || other.equals(address)) return false;
            byte[] a = address.getAddress(), b = other.getAddress();
            for (int bit = 0; bit < prefix; bit++) if (((a[bit / 8] ^ b[bit / 8]) & (128 >> (bit % 8))) != 0) return false;
            // Never route to subnet broadcast/network destinations.
            boolean allZero = true, allOne = true;
            for (int bit = prefix; bit < 32; bit++) { boolean set = (b[bit / 8] & (128 >> (bit % 8))) != 0; allZero &= !set; allOne &= set; }
            return !allZero && !allOne;
        }
    }

    private Wifi findWifi() throws IOException {
        ConnectivityManager cm = (ConnectivityManager)getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        // Deliberately do not require NET_CAPABILITY_INTERNET or VALIDATED: WAN may be unplugged.
        for (Network n : cm.getAllNetworks()) {
            NetworkCapabilities cap = cm.getNetworkCapabilities(n);
            if (cap == null || !cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || cap.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) continue;
            LinkProperties props = cm.getLinkProperties(n);
            if (props == null) continue;
            for (LinkAddress link : props.getLinkAddresses()) {
                InetAddress a = link.getAddress();
                if (a instanceof Inet4Address && a.isSiteLocalAddress() && link.getPrefixLength() >= 8 && link.getPrefixLength() <= 30)
                    return new Wifi(n, a, link.getPrefixLength());
            }
        }
        throw new IOException("wifi");
    }

    private boolean wifiStillValid(Wifi selected) {
        ConnectivityManager cm = (ConnectivityManager)getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkCapabilities cap = cm.getNetworkCapabilities(selected.network);
        LinkProperties props = cm.getLinkProperties(selected.network);
        if (cap == null || props == null || !cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return false;
        for (LinkAddress a : props.getLinkAddresses()) if (a.getAddress().equals(selected.address) && a.getPrefixLength() == selected.prefix) return true;
        return false;
    }

    private InetAddress numericAddress(String value) throws IOException {
        if (value == null || !value.matches("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}")) throw new IOException("address");
        String[] parts = value.split("\\."); byte[] bytes = new byte[4];
        for (int i = 0; i < 4; i++) { int n = Integer.parseInt(parts[i]); if (n > 255 || !Integer.toString(n).equals(parts[i])) throw new IOException("address"); bytes[i] = (byte)n; }
        return InetAddress.getByAddress(bytes); // Never getByName: no DNS lookup is allowed.
    }

    @PluginMethod public void listen(PluginCall call) {
        final int gen = reset();
        new Thread(() -> {
            ServerSocket opened = null;
            try {
                Wifi selected = findWifi(); opened = new ServerSocket();
                opened.setReuseAddress(true);
                opened.bind(new InetSocketAddress(selected.address, 0), 2);
                opened.setSoTimeout(1000);
                synchronized (this) { if (generation != gen) { opened.close(); call.reject("cancelled"); return; } wifi = selected; server = opened; }
                JSObject result = new JSObject(); result.put("address", selected.address.getHostAddress()); result.put("port", opened.getLocalPort()); call.resolve(result);
                while (generation == gen && !opened.isClosed()) {
                    if (!wifiStillValid(selected)) throw new IOException("network");
                    Socket candidate;
                    try { candidate = opened.accept(); } catch (java.net.SocketTimeoutException timeout) { continue; }
                    long now = SystemClock.elapsedRealtime();
                    if (peer != null || now - lastAccept < 1000 || !selected.contains(candidate.getInetAddress())) {
                        if (peer != null) rejectFull(candidate);
                        candidate.close(); continue;
                    }
                    lastAccept = now;
                    attach(candidate, gen, selected);
                }
            } catch (Exception error) {
                if (generation == gen) { if (server == null) call.reject(code(error)); else event("disconnected", "network"); reset(); }
                if (opened != null) try { opened.close(); } catch (IOException ignored) { }
            }
        }, "DoodleLan-listen").start();
    }

    @PluginMethod public void connect(PluginCall call) {
        String address = call.getString("address"); Integer port = call.getInt("port");
        final int gen = reset();
        new Thread(() -> {
            Socket socket = new Socket();
            try {
                Wifi selected = findWifi(); InetAddress destination = numericAddress(address);
                if (port == null || port < 1024 || port > 65535 || !selected.contains(destination)) throw new IOException("address");
                synchronized (this) { if (generation != gen) throw new IOException("cancelled"); connecting = socket; }
                selected.network.bindSocket(socket); // Explicit Wi-Fi routing even if mobile data is the default network.
                socket.bind(new InetSocketAddress(selected.address, 0));
                socket.connect(new InetSocketAddress(destination, port), 5000);
                attach(socket, gen, selected); call.resolve();
            } catch (Exception error) { try { socket.close(); } catch (IOException ignored) { } if (generation == gen) call.reject(code(error)); else call.reject("cancelled"); }
            finally { if (connecting == socket) connecting = null; }
        }, "DoodleLan-connect").start();
    }

    private synchronized void attach(Socket socket, int gen, Wifi selected) throws IOException {
        if (generation != gen || peer != null) { socket.close(); throw new IOException("cancelled"); }
        socket.setTcpNoDelay(true); socket.setKeepAlive(true); socket.setSoTimeout(8000);
        peer = socket; wifi = selected;
        final Semaphore budget = new Semaphore(4); bridgeBudget = budget;
        final int connection = ++connectionId;
        event("connected", null);
        Thread reader = new Thread(() -> {
            try {
                DataInputStream input = new DataInputStream(socket.getInputStream());
                long window = SystemClock.elapsedRealtime(); int count = 0;
                while (generation == gen && peer == socket) {
                    int length = input.readInt();
                    if (length < 2 || length > MAX_FRAME) throw new IOException("packet");
                    long now = SystemClock.elapsedRealtime();
                    if (now - window >= 1000) { window = now; count = 0; }
                    if (++count > 90 || !wifiStillValid(selected)) throw new IOException("packet");
                    // Four unacknowledged bridge messages at most, even if WebView JS is suspended.
                    if (!budget.tryAcquire(2, TimeUnit.SECONDS)) throw new IOException("backpressure");
                    byte[] bytes = new byte[length];
                    long deadline = SystemClock.elapsedRealtime() + 8000; int offset = 0;
                    while (offset < length) {
                        long remaining = deadline - SystemClock.elapsedRealtime();
                        if (remaining <= 0) throw new IOException("timeout");
                        socket.setSoTimeout((int)remaining);
                        int received = input.read(bytes, offset, length - offset);
                        if (received < 0) throw new IOException("connection");
                        offset += received;
                    }
                    socket.setSoTimeout(8000);
                    String data = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
                    JSObject event = new JSObject(); event.put("type", "message"); event.put("data", data); event.put("connection", connection); notifyListeners("lanEvent", event);
                }
            } catch (Exception error) { drop(socket, "connection"); }
        }, "DoodleLan-read"); reader.setDaemon(true); reader.start();
    }

    private void rejectFull(Socket socket) {
        try { byte[] data = "{\"type\":\"REJECT\",\"reason\":\"full\"}".getBytes(StandardCharsets.UTF_8); DataOutputStream out = new DataOutputStream(socket.getOutputStream()); out.writeInt(data.length); out.write(data); out.flush(); } catch (IOException ignored) { }
    }

    @PluginMethod public void send(PluginCall call) {
        String text = call.getString("data");
        if (text == null || text.length() > MAX_FRAME) { call.reject("packet"); return; }
        byte[] data = text.getBytes(StandardCharsets.UTF_8); Socket socket = peer;
        if (data.length > MAX_FRAME || socket == null) { call.reject("connection"); return; }
        try { writes.execute(() -> {
            try {
                if (peer != socket) throw new IOException("connection");
                DataOutputStream out = new DataOutputStream(socket.getOutputStream()); out.writeInt(data.length); out.write(data); out.flush(); call.resolve();
            } catch (Exception error) { drop(socket, "connection"); call.reject("connection"); }
        }); } catch (java.util.concurrent.RejectedExecutionException full) { drop(socket, "backpressure"); call.reject("backpressure"); }
    }

    private synchronized void drop(Socket socket, String reason) {
        if (peer != socket) return;
        peer = null; try { socket.close(); } catch (IOException ignored) { }
        event("disconnected", reason);
    }
    @PluginMethod public synchronized void acknowledge(PluginCall call) {
        Integer connection = call.getInt("connection"); Semaphore budget = bridgeBudget;
        if (connection != null && connection == connectionId && budget != null && budget.availablePermits() < 4) budget.release();
        call.resolve();
    }
    @PluginMethod public void dropPeer(PluginCall call) { Socket socket = peer; if (socket != null) drop(socket, "connection"); call.resolve(); }
    @PluginMethod public void close(PluginCall call) { reset(); call.resolve(); }
    private synchronized int reset() {
        generation++;
        Socket socket = peer; peer = null;
        if (socket != null) try { socket.close(); } catch (IOException ignored) { }
        Socket pending = connecting; connecting = null;
        if (pending != null) try { pending.close(); } catch (IOException ignored) { }
        ServerSocket listener = server; server = null;
        if (listener != null) try { listener.close(); } catch (IOException ignored) { }
        wifi = null; bridgeBudget = null; return generation;
    }
    private String code(Exception error) { String message = error.getMessage(); return "wifi".equals(message) || "address".equals(message) || "cancelled".equals(message) ? message : "connection"; }
    private void event(String type, String reason) { JSObject value = new JSObject(); value.put("type", type); if (reason != null) value.put("reason", reason); notifyListeners("lanEvent", value); }
    @Override protected void handleOnPause() {
        event("background", null);
        // Inform the other phone in native code before WebView JavaScript is suspended.
        Socket socket = peer;
        if (socket != null) try { writes.execute(() -> {
            try {
                if (peer != socket) return;
                byte[] data = "{\"type\":\"BACKGROUND\"}".getBytes(StandardCharsets.UTF_8);
                DataOutputStream out = new DataOutputStream(socket.getOutputStream()); out.writeInt(data.length); out.write(data); out.flush();
            } catch (Exception error) { drop(socket, "connection"); }
        }); } catch (java.util.concurrent.RejectedExecutionException full) { drop(socket, "backpressure"); }
    }
    @Override protected void handleOnResume() { event("foreground", null); }
    @Override protected void handleOnDestroy() { reset(); writes.shutdownNow(); }
}
