declare module "virtual:nasaq-catalogue" {
  export const components: {
    name: string;
    title: string;
    category: string;
    status: string;
    summary: string;
    story: string;
  }[];
}

declare module "*.md?raw" {
  const text: string;
  export default text;
}

declare module "virtual:nasaq-exports" {
  /** Exported name -> the shadcn import path its file installs to ("@/components/ui/tabs"). */
  export const exportsMap: Record<string, string>;
}
