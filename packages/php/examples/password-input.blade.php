<div class="flex w-full max-w-sm flex-col gap-1.5">
    <label for="new-password" class="text-label text-foreground">New password</label>
    <x-nq::password-input id="new-password" name="password" autocomplete="new-password" show-strength :rules="true" />
</div>
