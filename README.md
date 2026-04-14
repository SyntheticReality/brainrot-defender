# Brainrot Defender

Chrome extension that blocks distraction sites on a schedule and throws up a full-screen defense page when you try to slip through.

## Defeating Brainrot

Defeating brainrot means recognizing that modern feeds are not neutral. They are ranked by recommender systems trained on engagement signals like watch history, search history, likes, comments, shares, skips, full-watch behavior, subscriptions, and notification opens. Behind that are large teams of engineers, data scientists, and growth systems working to win more of your attention, one session at a time.

Brainrot Defender is a small countermeasure. It adds deliberate friction against systems designed to maximize time spent with autoplay, infinite scroll, push notifications, social proof, and hyper-personalized recommendations, so you get a better chance to choose your work instead of getting pulled into the feed.

### Evidence

- The [U.S. Surgeon General advisory](https://www.hhs.gov/sites/default/files/sg-youth-mental-health-social-media-advisory.pdf) says platforms are often designed to maximize engagement and specifically calls out push notifications, autoplay, infinite scroll, like counts, and algorithmic recommendations. It also cites youth usage data showing average social media use of 3.5 hours per day, with 1 in 4 teens at 5+ hours per day.
- [YouTube](https://support.google.com/youtube/answer/9962575) says its recommendation system learns from more than 80 billion signals, including watch history, search history, subscriptions, likes, dislikes, and satisfaction surveys.
- [TikTok](https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content) says its For You ranking heavily weights user interactions, including what you like, share, comment on, watch in full, skip, and how much time you spend watching.
- [Pew 2024](https://www.pewresearch.org/internet/2024/12/12/teens-social-media-and-technology-2024/) reports that some teens say they are on major platforms almost constantly, and [Pew 2025](https://www.pewresearch.org/internet/2025/04/22/teens-social-media-and-mental-health/) reports that 45% of teens say they spend too much time on social media.

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
