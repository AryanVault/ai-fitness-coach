import type { Locator } from "@playwright/test";

export async function textContrast(locator: Locator) {
  return locator.evaluate(element => {
    const canvas=document.createElement("canvas");canvas.width=1;canvas.height=1;
    const ctx=canvas.getContext("2d")!;
    const rgba=(css:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=css;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
    const layers:Element[]=[];let current:Element|null=element;
    while(current){layers.unshift(current);current=current.parentElement;}
    let background=[255,255,255];
    for(const layer of layers){const color=rgba(getComputedStyle(layer).backgroundColor);background=background.map((value,i)=>color[i]*color[3]/255+value*(1-color[3]/255));}
    const foreground=rgba(getComputedStyle(element).color);
    const luminance=(color:number[])=>color.slice(0,3).map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const a=luminance(foreground),b=luminance(background);
    return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),foreground:foreground.slice(0,3),background};
  });
}
