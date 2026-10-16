import BytesClient from "./BytesClient";

// Flight sends typed arrays as raw bytes; 128 and 255 aren't valid UTF-8.
export default function Page() {
  return <BytesClient bytes={new Uint8Array([0, 128, 255])} />;
}
