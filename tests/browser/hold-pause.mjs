/** Send a genuine pointer hold (mouse or pen uses the same PointerEvents as touch). */
export async function holdPause(page,durationMs=2100){
 const button=page.locator(".game-ui__mobile-pause");
 const rect=await button.boundingBox();
 if(!rect)throw new Error("The pause trigger is not visible");
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
 await page.mouse.down();
 try{await page.waitForTimeout(durationMs);}
 finally{await page.mouse.up();}
}
