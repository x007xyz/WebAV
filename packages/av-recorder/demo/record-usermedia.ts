import { Combinator } from '@webav/av-cliper';
import { AVRecorder } from '../src/av-recorder';
(async () => {
  if (!(await Combinator.isSupported())) {
    alert('Your browser does not support WebCodecs');
  }
})();

let recorder: AVRecorder | null = null;
const startEl = document.querySelector('#startRecod') as HTMLButtonElement;
startEl?.addEventListener('click', () => {
  (async () => {
    const mediaStream =
      // @ts-expect-error
      document.querySelector('input[name="source"]:checked')?.value === 'camera'
        ? await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })
        : await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
    const recodeMS = mediaStream.clone();
    const vEl = document.querySelector('video') as HTMLVideoElement;
    vEl.muted = true;
    vEl.srcObject = mediaStream;
    vEl.play().catch(console.error);

    recorder = new AVRecorder(recodeMS);
    recorder.on('stateChange', (state) => {
      console.log('stateChange:', state);
    });

    const writer = await createFileWriter('mp4');
    recorder.start().pipeTo(writer).catch(console.error);

    Object.assign(startEl.style, { visibility: 'hidden' });
    Object.assign(pauseEl.style, { visibility: 'visible' });
    Object.assign(continueEl.style, { visibility: 'hidden' });
  })().catch(console.error);
});
const stopEl = document.querySelector('#stopRecod') as HTMLButtonElement;
stopEl?.addEventListener('click', () => {
  (async () => {
    await recorder?.stop();
    alert('save done');
    Object.assign(startEl.style, { visibility: 'visible' });
    Object.assign(pauseEl.style, { visibility: 'hidden' });
    Object.assign(continueEl.style, { visibility: 'hidden' });
  })().catch(console.error);
});

const pauseEl = document.querySelector('#pauseRecod') as HTMLButtonElement;
pauseEl?.addEventListener('click', () => {
  (async () => {
    if (recorder == null) return;
    recorder.pause();

    Object.assign(startEl.style, { visibility: 'hidden' });
    Object.assign(pauseEl.style, { visibility: 'hidden' });
    Object.assign(continueEl.style, { visibility: 'visible' });
  })().catch(console.error);
});
const continueEl = document.querySelector(
  '#continueRecod',
) as HTMLButtonElement;
continueEl?.addEventListener('click', () => {
  (async () => {
    if (recorder == null) return;
    recorder.resume();

    Object.assign(startEl.style, { visibility: 'hidden' });
    Object.assign(pauseEl.style, { visibility: 'visible' });
    Object.assign(continueEl.style, { visibility: 'hidden' });
  })().catch(console.error);
});

async function createFileWriter(
  extName: string,
): Promise<FileSystemWritableFileStream> {
  const fileHandle = await window.showSaveFilePicker({
    suggestedName: `WebAV-export-${Date.now()}.${extName}`,
  });
  return fileHandle.createWritable();
}
