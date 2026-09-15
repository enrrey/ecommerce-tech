import { Space_Grotesk } from "next/font/google";

// `next/font` exige invocación en scope de módulo, por eso la instancia vive en
// un archivo propio: storefront y admin la comparten sin duplicar la carga.
export const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
