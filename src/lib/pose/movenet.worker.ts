import * as tf from "@tensorflow/tfjs-core";
import { loadGraphModel, type GraphModel } from "@tensorflow/tfjs-converter";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { decodeMoveNet } from "./providers";
import type { PoseWorkerRequest, PoseWorkerReply } from "./tracking.worker";

let model: GraphModel | null = null;
let busy = false;
const scope=self as unknown as {onmessage:((event:MessageEvent<PoseWorkerRequest>)=>void)|null;postMessage:(reply:PoseWorkerReply)=>void};
scope.onmessage=async({data})=>{
  if(busy){data.bitmap?.close();scope.postMessage({id:data.id,error:"Pose worker is busy"});return;}
  busy=true;
  let input:tf.Tensor|undefined; let prediction:tf.Tensor|undefined;
  try {
    if(data.type==="stop"){model?.dispose();model=null;scope.postMessage({id:data.id});return;}
    if(data.type==="init"){
      setWasmPaths(`${data.origin}/movenet/wasm/`);
      await tf.setBackend("wasm"); await tf.ready();
      model?.dispose(); model=await loadGraphModel(`${data.origin}/movenet/thunder/model.json`);
      scope.postMessage({id:data.id});return;
    }
    if(!model || !data.bitmap)throw new Error("Model not initialized");
    const started=performance.now();
    const {width,height}=data.bitmap;
    const size=256,scale=size/Math.max(width,height),w=Math.round(width*scale),h=Math.round(height*scale);
    const canvas=new OffscreenCanvas(width,height);
    const context=canvas.getContext("2d",{willReadFrequently:true});
    if(!context)throw new Error("Image processing unavailable");
    context.drawImage(data.bitmap,0,0);
    const pixels=context.getImageData(0,0,width,height);
    let brightness=0;
    for(let i=0;i<pixels.data.length;i+=4*64)brightness+=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3;
    brightness/=Math.ceil(pixels.data.length/(4*64));
    const left=Math.floor((size-w)/2),top=Math.floor((size-h)/2);
    input=tf.tidy(()=>{
      const frame=tf.browser.fromPixels(pixels);
      const resized=tf.image.resizeBilinear(frame,[h,w]);
      return tf.expandDims(tf.cast(tf.pad(resized,[[top,size-h-top],[left,size-w-left],[0,0]]),"int32"),0);
    });
    prediction=model.predict(input) as tf.Tensor;
    const landmarks=decodeMoveNet(await prediction.data(),{width,height});
    scope.postMessage({id:data.id,landmarks,worldLandmarks:[],brightness,latencyMs:performance.now()-started,delegate:"WASM",provider:"movenet"});
  } catch {scope.postMessage({id:data.id,error:"MoveNet unavailable. Returning to balanced tracking."});}
  finally {input?.dispose();prediction?.dispose();data.bitmap?.close();busy=false;}
};
