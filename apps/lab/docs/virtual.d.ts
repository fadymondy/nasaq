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
