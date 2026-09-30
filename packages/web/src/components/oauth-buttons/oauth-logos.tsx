import type { ComponentProps } from "react";

/*
 * Official provider marks, unmodified: same path data, same colours, same proportions. Never recolour,
 * mirror (not in RTL either), stretch or redraw them. SVG is not affected by `dir`.
 * Colours are the providers' own brand colours, so they are the one place raw hex is allowed here.
 */
type LogoProps = Omit<ComponentProps<"svg">, "viewBox" | "children">;

// Google "G". Source: https://developers.google.com/identity/branding-guidelines
// (branding_guideline_sample_lt_sq_sl.svg, the 20x20 glyph inside the 40x40 button asset).
const GOOGLE = { blue: "#4285F4", green: "#34A853", yellow: "#FBBC04", red: "#E94235" }; // nasaq-lint-ignore (official Google colours)

export function GoogleLogo(props: LogoProps) {
  return (
    <svg viewBox="10 10 20 20" width={20} height={20} aria-hidden="true" focusable="false" {...props}>
      <path
        d="M29.6 20.2273C29.6 19.5182 29.5364 18.8364 29.4182 18.1818H20V22.05H25.3818C25.15 23.3 24.4455 24.3591 23.3864 25.0682V27.5773H26.6182C28.5091 25.8364 29.6 23.2727 29.6 20.2273Z"
        fill={GOOGLE.blue}
      />
      <path
        d="M20 30C22.7 30 24.9636 29.1045 26.6181 27.5773L23.3863 25.0682C22.4909 25.6682 21.3454 26.0227 20 26.0227C17.3954 26.0227 15.1909 24.2636 14.4045 21.9H11.0636V24.4909C12.7091 27.7591 16.0909 30 20 30Z"
        fill={GOOGLE.green}
      />
      <path
        d="M14.4045 21.9C14.2045 21.3 14.0909 20.6591 14.0909 20C14.0909 19.3409 14.2045 18.7 14.4045 18.1V15.5091H11.0636C10.3864 16.8591 10 18.3864 10 20C10 21.6136 10.3864 23.1409 11.0636 24.4909L14.4045 21.9Z"
        fill={GOOGLE.yellow}
      />
      <path
        d="M20 13.9773C21.4681 13.9773 22.7863 14.4818 23.8227 15.4727L26.6909 12.6045C24.9591 10.9909 22.6954 10 20 10C16.0909 10 12.7091 12.2409 11.0636 15.5091L14.4045 18.1C15.1909 15.7364 17.3954 13.9773 20 13.9773Z"
        fill={GOOGLE.red}
      />
    </svg>
  );
}

// GitHub Invertocat mark. Source: https://brand.github.com/ (GitHub_Logos.zip, SVG/GitHub_Invertocat_Black.svg
// and GitHub_Invertocat_White.svg). Black on light surfaces, white on dark ones, as GitHub's guidelines allow.
const GITHUB_MARK =
  "M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z";

export function GitHubLogo({ onDark = false, ...props }: LogoProps & { onDark?: boolean }) {
  return (
    <svg viewBox="0 0 98 96" width={20} height={20} aria-hidden="true" focusable="false" {...props}>
      <path d={GITHUB_MARK} fill={onDark ? "white" : "black"} />
    </svg>
  );
}

// Apple logo. Source: the "Sign in with Apple" JS (https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js),
// which draws this glyph inside every official Apple button. Black on light, white on dark, per Apple's HIG.
const APPLE_LOGO =
  "M28.2226562,20.3846154 C29.0546875,20.3846154 30.0976562,19.8048315 30.71875,19.0317864 C31.28125,18.3312142 31.6914062,17.352829 31.6914062,16.3744437 C31.6914062,16.2415766 31.6796875,16.1087095 31.65625,16 C30.7304687,16.0362365 29.6171875,16.640178 28.9492187,17.4494596 C28.421875,18.06548 27.9414062,19.0317864 27.9414062,20.0222505 C27.9414062,20.1671964 27.9648438,20.3121424 27.9765625,20.3604577 C28.0351562,20.3725366 28.1289062,20.3846154 28.2226562,20.3846154 Z M25.2929688,35 C26.4296875,35 26.9335938,34.214876 28.3515625,34.214876 C29.7929688,34.214876 30.109375,34.9758423 31.375,34.9758423 C32.6171875,34.9758423 33.4492188,33.792117 34.234375,32.6325493 C35.1132812,31.3038779 35.4765625,29.9993643 35.5,29.9389701 C35.4179688,29.9148125 33.0390625,28.9122695 33.0390625,26.0979021 C33.0390625,23.6579784 34.9140625,22.5588048 35.0195312,22.474253 C33.7773438,20.6382708 31.890625,20.5899555 31.375,20.5899555 C29.9804688,20.5899555 28.84375,21.4596313 28.1289062,21.4596313 C27.3554688,21.4596313 26.3359375,20.6382708 25.1289062,20.6382708 C22.8320312,20.6382708 20.5,22.5950413 20.5,26.2911634 C20.5,28.5861411 21.3671875,31.013986 22.4335938,32.5842339 C23.3476562,33.9129053 24.1445312,35 25.2929688,35 Z";

export function AppleLogo({ onDark = false, ...props }: LogoProps & { onDark?: boolean }) {
  return (
    <svg viewBox="20 15.5 16 20" width={14} height={17.5} aria-hidden="true" focusable="false" {...props}>
      <path d={APPLE_LOGO} fill={onDark ? "white" : "black"} fillRule="nonzero" />
    </svg>
  );
}

// Microsoft four-square symbol. Source: https://learn.microsoft.com/entra/identity-platform/howto-add-branding-in-apps
// (ms-symbollockup_mssymbol_19.svg).
const MICROSOFT = { red: "#f25022", blue: "#00a4ef", green: "#7fba00", yellow: "#ffb900" }; // nasaq-lint-ignore (official Microsoft colours)

export function MicrosoftLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 21 21" width={20} height={20} aria-hidden="true" focusable="false" {...props}>
      <rect x="1" y="1" width="9" height="9" fill={MICROSOFT.red} />
      <rect x="1" y="11" width="9" height="9" fill={MICROSOFT.blue} />
      <rect x="11" y="1" width="9" height="9" fill={MICROSOFT.green} />
      <rect x="11" y="11" width="9" height="9" fill={MICROSOFT.yellow} />
    </svg>
  );
}
