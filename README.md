# Brainrot Defender

Chrome extension that blocks distraction sites on a schedule and throws up a full-screen defense page when you try to slip through.

## Why This Exists

Modern feeds are not neutral. They are built by some of the world's most sophisticated psychologists, growth teams, recommender engineers, and data systems. Their job is to turn attention into retention, retention into habit, and habit into more sessions.

Brainrot Defender is not a cure and it is not a life philosophy. It is a minimal brain defense layer.

The goal is not purity. The goal is friction.

One extra wall between you and the feed can be enough to break the automatic loop and give your better judgment time to get back in the room.

### Evidence

- The [U.S. Surgeon General advisory](https://www.hhs.gov/sites/default/files/sg-youth-mental-health-social-media-advisory.pdf) says platforms are often designed to maximize engagement and specifically calls out push notifications, autoplay, infinite scroll, like counts, and algorithmic recommendations.
- [YouTube](https://support.google.com/youtube/answer/9962575) says its recommendation system learns from more than 80 billion signals, including watch history, search history, subscriptions, likes, dislikes, and satisfaction surveys.
- [Pew 2025](https://www.pewresearch.org/internet/2025/04/22/teens-social-media-and-mental-health/) reports that 45% of teens say they spend too much time on social media.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome or another Chromium browser.
3. Turn on `Developer mode` in the top-right corner.
4. Click `Load unpacked`.
5. Select the `brainrot-defender` folder you cloned locally.
6. Pin `Brainrot Defender` from the extensions toolbar if you want quick access.

## Notes

- The extension uses scheduled blocking windows you can change from the popup.
- Built-in suggested sites include X, LinkedIn, Facebook, YouTube, Instagram, and TikTok.
- Custom sites can be added from the popup and will request host permission when needed.
- The extension stores settings in Chrome storage and does not send browsing data to a remote server.
