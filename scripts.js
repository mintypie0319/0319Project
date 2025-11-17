const GLOBAL = {
    phase: 0,
    contentPrefix: 'https://x.com/intent/tweet?text=',
    contentSuffix: '%0A%0ASAKURA%20Dream%20To%20Tokyo%20Dome%0A%23IntoSAKURADreamWorld%0A%23%E5%AE%AE%E8%84%87%E5%92%B2%E8%89%AF'
};

const EVENT_TIMES = {
    phase1Start: new Date('2025-11-18 17:00:00'),
    phase2Start: new Date('2025-11-18 17:15:01'),
    phase2End: new Date('2025-11-19 00:00:00')
};

const SELECTORS = {
    links: '.js-link__toggle',
    timer: '.js-link__timer',
    timeLabel: '.js-time__label',
    tutorials: '.js-time__tutorial-block'
};

let timeJST = new Date();
let tweetLinksInitialized = false;

// ===== Labels based on language =====
const LABELS = LANG === 'zh-cn' ? {
    ready: '准备好了！',
    clickWhenPhase1: '阶段 1 开始时点击发推',
    shortCooldown: '秒后可再次发推',
    clickAgain: '再次点击发推',
    longPause: '暂停，请等待 {minutes} 分钟',
    timeUntilEvent: '距离活动开始时间：<strong>{h}小时 {m}分钟 {s}秒</strong>',
    phase1Started: '阶段 1 已开始！剩余时间：<strong>{h}小时 {m}分钟 {s}秒</strong>',
    phase2Started: '阶段 2 已开始！剩余时间：<strong>{h}小时 {m}分钟 {s}秒</strong>'
} : {
    ready: 'Ready!',
    clickWhenPhase1: 'Click to tweet when Phase 1 starts',
    shortCooldown: 'seconds left to tweet',
    clickAgain: 'Click to tweet again',
    longPause: 'Pause, wait for {minutes} minute(s)',
    timeUntilEvent: 'Time until the event starts: <strong>{h}h {m}m {s}s</strong>',
    phase1Started: 'Phase 1 has started! Time left: <strong>{h}h {m}m {s}s</strong>',
    phase2Started: 'Phase 2 has started! Time left: <strong>{h}h {m}m {s}s</strong>'
};

// ====== FUNCTIONS ======
function formatTime(diff) {
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { hours, minutes, seconds };
}

async function fetchTime() {
    try {
        const response = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Tokyo');
        const data = await response.json();
        timeJST = new Date(data.dateTime);
        updateCountdownDisplay();
    } catch (error) {
        console.error('Error fetching time:', error);
    }
}

function updateCountdownDisplay() {
    const output = document.querySelector(SELECTORS.timeLabel);
    const links = document.querySelectorAll(SELECTORS.links);
    const tutorials = document.querySelectorAll(SELECTORS.tutorials);
    tutorials.forEach(t => t.style.display = 'none');

    if (!output) return;

    if (timeJST < EVENT_TIMES.phase1Start) {
        const { hours, minutes, seconds } = formatTime(EVENT_TIMES.phase1Start - timeJST);
        output.innerHTML = LABELS.timeUntilEvent
            .replace('{h}', hours)
            .replace('{m}', minutes)
            .replace('{s}', seconds);
        GLOBAL.phase = 0;
        links.forEach(l => { l.style.pointerEvents = 'none'; l.style.opacity = '0.5'; });
        const timer = document.querySelector(SELECTORS.timer);
        if (timer) timer.innerHTML = LABELS.clickWhenPhase1;

    } else if (timeJST >= EVENT_TIMES.phase1Start && timeJST < EVENT_TIMES.phase2Start) {
        const { hours, minutes, seconds } = formatTime(EVENT_TIMES.phase2Start - timeJST);
        output.innerHTML = LABELS.phase1Started
            .replace('{h}', hours)
            .replace('{m}', minutes)
            .replace('{s}', seconds);
        GLOBAL.phase = 1;
        links.forEach(l => { l.style.pointerEvents = ''; l.style.opacity = ''; });
        tutorials.forEach(t => {
            if (t.getAttribute('data-time-tutorial-toggle') === "1") t.style.display = "block";
        });

        if (!tweetLinksInitialized) {
            initTweetLinks();
            tweetLinksInitialized = true;
        }

    } else if (timeJST >= EVENT_TIMES.phase2Start) {
        const { hours, minutes, seconds } = formatTime(EVENT_TIMES.phase2End - timeJST);
        output.innerHTML = LABELS.phase2Started
            .replace('{h}', hours)
            .replace('{m}', minutes)
            .replace('{s}', seconds);
        GLOBAL.phase = 2;
        links.forEach(l => { l.style.pointerEvents = ''; l.style.opacity = ''; });
        tutorials.forEach(t => {
            if (t.getAttribute('data-time-tutorial-toggle') === "2") t.style.display = "block";
        });

        if (!tweetLinksInitialized) {
            initTweetLinks();
            tweetLinksInitialized = true;
        }
    }
}

// ===== Tweet Links =====
async function initTweetLinks() {
    const links = document.querySelectorAll(SELECTORS.links);
    const timer = document.querySelector(SELECTORS.timer);
    if (!links.length || !timer) return;

    let clickCount = 0;
    let longCooldown = false;
    let lastClickTime = Date.now();
    let tweets = [];
    let usedTweets = [];

    try {
        const response = await fetch('tweets.json');
        tweets = await response.json();
    } catch (err) {
        console.error('Failed to load tweets.json:', err);
    }

    function openTweet(link) {
        if (longCooldown) return;
        lastClickTime = Date.now();
        clickCount++;

        const type = link.getAttribute('data-link-type');
        let src = '';
        if (type === 'pre' && tweets.length) {
            let available = tweets.filter(t => !usedTweets.includes(t));
            if (!available.length) usedTweets = [];
            available = tweets.filter(t => !usedTweets.includes(t));
            src = available[Math.floor(Math.random() * available.length)];
            usedTweets.push(src);
        } else {
            src = link.getAttribute('data-link-src') || '';
        }

        window.open(GLOBAL.contentPrefix + src + GLOBAL.contentSuffix);
        startShortCooldown(timer, links);

        if (clickCount >= 5) {
            clickCount = 0;
            usedTweets = [];
        }
    }

    function startShortCooldown(timer, links) {
        let seconds = Math.floor(Math.random() * 11) + 10;
        links.forEach(l => { l.style.pointerEvents = 'none'; l.style.opacity = '0.5'; });
        timer.innerHTML = `${seconds} ${LABELS.shortCooldown}`;

        const interval = setInterval(() => {
            seconds--;
            if (seconds > 0) {
                timer.innerHTML = `${seconds} ${LABELS.shortCooldown}`;
            } else {
                clearInterval(interval);
                timer.innerHTML = LABELS.clickAgain;
                links.forEach(l => { l.style.pointerEvents = ''; l.style.opacity = ''; });
            }
        }, 1000);
    }

    links.forEach(link => link.addEventListener('click', () => openTweet(link)));

    setInterval(() => {
        if (longCooldown || GLOBAL.phase === 0) return;

        const now = Date.now();
        const inactivityMinutes = (now - lastClickTime) / 1000 / 60;
        let longSeconds = Math.floor(Math.random() * 300) + 120;
        longSeconds -= inactivityMinutes * 60;
        if (longSeconds < 0) longSeconds = 0;

        longCooldown = true;

        const interval = setInterval(() => {
            longSeconds--;
            const minutesLeft = Math.ceil(longSeconds / 60);
            timer.innerHTML = LABELS.longPause.replace('{minutes}', minutesLeft);

            if (longSeconds <= 0) {
                clearInterval(interval);
                longCooldown = false;
                timer.innerHTML = LABELS.clickAgain;
                lastClickTime = Date.now();
            }
        }, 1000);
    }, 60000);
}

// ===== Countdown =====
function initCountdown() {
    setInterval(() => {
        timeJST = new Date(timeJST.getTime() + 1000);
        updateCountdownDisplay();
    }, 1000);

    setInterval(fetchTime, 300000);
    fetchTime();
}

// ===== INIT =====
initCountdown();
