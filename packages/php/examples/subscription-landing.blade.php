<x-nq::subscription-landing mode="subscribe" brand="Nasaq" x-on:nq-subscribe="$event.detail.waitUntil(new Promise((resolve) => setTimeout(resolve, 600)))" />
