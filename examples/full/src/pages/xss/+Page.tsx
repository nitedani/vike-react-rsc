import TextClient from "./TextClient";

// Would end the inline <script> the RSC payload travels in, if left unescaped.
export default function Page() {
  return <TextClient text="</script><script>window.__xss=1</script>" />;
}
