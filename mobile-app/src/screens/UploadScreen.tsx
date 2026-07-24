import { PlaceholderPanel } from '../components/PlaceholderPanel';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';

export function UploadScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Create" title="Upload" />
      <PlaceholderPanel
        actionLabel="Choose file"
        body="Placeholder upload flow for selecting, previewing, and preparing image, video, or audio media."
        icon="cloud-upload-outline"
        title="Upload Media"
      />
    </Screen>
  );
}
