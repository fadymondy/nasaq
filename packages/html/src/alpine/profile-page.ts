// nqProfilePage: the two buttons of the profile page that the host answers. The markup is the React ProfilePage's (see the Blade component).
//
//   <div data-slot="profile-page" x-data="nqProfilePage">…</div>
//
// Events (bubbling): "profile-contact" when the contact button (contact-button) is pressed, "profile-edit" when the owner presses "Edit profile".
// The sidebar and the closing call to action each carry their own x-data="nqProfilePage", so the events work from either part used alone.

import type { Magics, Register } from "./types";

export const profilePage: Register = (Alpine) => {
  Alpine.data("nqProfilePage", () => ({
    contact(this: Magics) {
      this.$dispatch("profile-contact");
    },
    edit(this: Magics) {
      this.$dispatch("profile-edit");
    },
  }));
};
