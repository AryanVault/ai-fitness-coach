# Local pose inference assets

MoveNet SinglePose Thunder v4 is provided by Google through TensorFlow Hub:
https://tfhub.dev/google/tfjs-model/movenet/singlepose/thunder/4

Architecture and usage reference:
https://github.com/tensorflow/tfjs-models/tree/master/pose-detection/src/movenet

TensorFlow.js is licensed under Apache License 2.0. Bundled workers retain license notices. Model assets are fetched without modification by scripts/prepare-tracking-models.mjs; download-manifest.json records source URLs and SHA-256 hashes. The MediaPipe Heavy asset comes from Google's official MediaPipe model storage. Retain upstream model terms when redistributing the weights.

The application serves model artifacts and WASM from its own origin. Camera frames are processed in a local worker; neither inference implementation uploads video. MoveNet supplies 17 2D keypoints. Missing fingers/toes/depth remain unavailable, and its single-pose output cannot establish that only one person is present.
