<div x-data
    x-on:nq-2fa-verify="$event.detail.wait(new Promise((resolve) => setTimeout(() => resolve($event.detail.code === '000000' ? { error: 'That code is not right.' } : { recoveryCodes: ['a1b2c-d3e4f', 'g5h6i-j7k8l', 'm9n0o-p1q2r', 's3t4u-v5w6x', 'y7z8a-b9c0d', 'e1f2g-h3i4j', 'k5l6m-n7o8p', 'q9r0s-t1u2v'] }), 600)))"
    x-on:nq-2fa-regenerate="$event.detail.wait(new Promise((resolve) => setTimeout(() => resolve(['n1n1n-n1n1n', 'm2m2m-m2m2m', 'k3k3k-k3k3k', 'j4j4j-j4j4j']), 600)))"
    x-on:nq-2fa-disable="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 600)))">
    <x-nq::two-factor-setup otpauth-uri="otpauth://totp/Nasaq:fady@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Nasaq" />
</div>
