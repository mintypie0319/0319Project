const GLOBAL = {
    phase: 0,
    contentPrefix: 'https://x.com/intent/tweet?text=',
    contentSuffix: '%0A%0ASAKURA%20Dream%20To%20Tokyo%20Dome%0A%23IntoSAKURADreamWorld%0A%23%E5%AE%AE%E8%84%87%E5%92%B2%E8%89%AF'
};

const GLOBAL_TIMES = {
    phase1Start: new Date('2025-11-18 17:00:00'),
    phase2Start: new Date('2025-11-18 17:15:01'),
    phase2End: new Date('2025-11-19 00:00:00')
};

const GLOBAL_SELECTORS = {
    links: '.js-link',
    label: '.js-label',
    timer: '.js-timer',
    tutorials: '.js-tutorial',
    formCheck: '.js-form-check'
};

let GLOBAL_TIMECURRENT = new Date();
let GLOBAL_TWEETS = [];
let GLOBAL_TWEETSUSED = [];
let GLOBAL_ISTIMEFETCHED = false;
let GLOBAL_ISTWEETFETCHED = false;

let GLOBAL_INTERVALINIT = null;
let GLOBAL_INTERVALFETCH = null;
let GLOBAL_INTERVALCOUNTDOWN = null;

let GLOBAL_ISCOUNTDOWNSTARTED = false;

let GLOBAL_CLICKEDTIMES = 0;

const GLOBAL_LABELS = LANG === 'zh-cn' ? {
    cooldown: '秒后可再次发推',
    labelPreFetch: '正在获取时间，请稍候…',
    labelPre: '仅在阶段 1 开始时可用，请稍候…',
    labelActive: '再次点击发推',
    timerPre: '距离活动开始时间：<strong>{h}小时 {m}分钟 {s}秒</strong>',
    timerPhase1: '阶段 1 已开始！剩余时间：<strong>{h}小时 {m}分钟 {s}秒</strong>',
    timerPhase2: '阶段 2 已开始！剩余时间：<strong>{h}小时 {m}分钟 {s}秒</strong>'
} : {
    cooldown: 'seconds left to tweet',
    labelPreFetch: 'Fetching time, please wait…',
    labelPre: 'Only available when Phase 1 starts, so please wait...',
    labelActive: 'Click to tweet again',
    timerPre: 'Time until the event starts: <strong>{h}h {m}m {s}s</strong>',
    timerPhase1: 'Phase 1 has started! Time left: <strong>{h}h {m}m {s}s</strong>',
    timerPhase2: 'Phase 2 has started! Time left: <strong>{h}h {m}m {s}s</strong>'
};

function formatTime(diff) {
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { hours, minutes, seconds };
}

function enableLinks() {
    const links = document.querySelectorAll(GLOBAL_SELECTORS.links);
    links.forEach(l => { l.style.pointerEvents = ''; l.style.opacity = ''; });
}

function disableLinks() {
    const links = document.querySelectorAll(GLOBAL_SELECTORS.links);
    links.forEach(l => { l.style.pointerEvents = 'none'; l.style.opacity = '0.5'; });
}

function setLabel(value) {
    const label = document.querySelector(GLOBAL_SELECTORS.label);
    if (label) label.innerHTML = value;
}

function setTimer(value) {
    const timer = document.querySelector(GLOBAL_SELECTORS.timer);
    if (timer) timer.innerHTML = value;
}

function displayTutorial(ID) {
    const tutorials = document.querySelectorAll(GLOBAL_SELECTORS.tutorials);
    tutorials.forEach(t => t.style.display = 'none');
    tutorials.forEach(t => {
        if (t.getAttribute('data-time-tutorial-toggle') === ID) t.style.display = 'block';
    });
}

async function fetchTime() {
    try {
        const response = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Tokyo');
        const data = await response.json();
        GLOBAL_TIMECURRENT = new Date(data.dateTime);
        GLOBAL_ISTIMEFETCHED = true;
        updateDOM();
    } catch (error) {
        console.error('Error fetching time:', error);
    }
}

async function fetchTweet() {
    try {
        const response = await fetch('tweets.json');
        GLOBAL_TWEETS = await response.json();
        GLOBAL_ISTWEETFETCHED = true;
    } catch (err) {
        console.error('Failed to load tweets:', err);
    }
}

function getTweet() {
    if (!GLOBAL_ISTWEETFETCHED) return;

    let tweetContent = '';
    let tweetsAvailable = GLOBAL_TWEETS.filter(tweet => !GLOBAL_TWEETSUSED.includes(tweet));
    tweetContent = tweetsAvailable[Math.floor(Math.random() * tweetsAvailable.length)];
    if (!tweetsAvailable.length) GLOBAL_TWEETSUSED = [];
    tweetsAvailable = GLOBAL_TWEETS.filter(tweet => !GLOBAL_TWEETSUSED.includes(tweet));
    return tweetContent;
}

function setDOM() {
    const links = document.querySelectorAll(GLOBAL_SELECTORS.links);
    const formInput = document.querySelector(GLOBAL_SELECTORS.formCheck + ' input');
    const formButton = document.querySelector(GLOBAL_SELECTORS.formCheck + ' button');

    links.forEach(link => link.addEventListener('click', () => {
        if (GLOBAL_ISCOUNTDOWNSTARTED) return;

        const type = link.getAttribute('data-link-type');
        let content = '';
        if (type === 'pre' && GLOBAL_TWEETS.length) {
            content = getTweet();
            GLOBAL_TWEETSUSED.push(content);
        }

        window.open(GLOBAL.contentPrefix + content + GLOBAL.contentSuffix);
        GLOBAL_CLICKEDTIMES++;
        setCountdown();
    }));
    
    links.forEach(link => link.addEventListener('click', () => {
        if (GLOBAL_ISCOUNTDOWNSTARTED) return;

        const type = link.getAttribute('data-link-type');
        let content = '';
        if (type === 'pre' && GLOBAL_TWEETS.length) {
            content = getTweet();
            GLOBAL_TWEETSUSED.push(content);
        }

        window.open(GLOBAL.contentPrefix + content + GLOBAL.contentSuffix);
        GLOBAL_CLICKEDTIMES++;
        setCountdown();
    }));

    formButton.addEventListener('click', function (e) {
        const username = formInput.value.trim();
        if (!username) {
            e.preventDefault();
            alert('Please enter a username first.');
            return;
        }
        window.open('https://shadowban.yuzurisa.com/' + encodeURIComponent(username), '_blank');
    });
}

function setCountdown() {
    if (GLOBAL_ISCOUNTDOWNSTARTED) return;
    GLOBAL_ISCOUNTDOWNSTARTED = true;

    let duration;
    const threshold = Math.floor(Math.random() * 11) + 10;

    if (GLOBAL_CLICKEDTIMES > threshold) {
        duration = Math.floor(Math.random() * (480 - 180 + 1)) + 180;
        GLOBAL_CLICKEDTIMES = 0;
    } else {
        duration = Math.floor(Math.random() * 11) + 10;
    }

    setLabel(`${duration} ${GLOBAL_LABELS.cooldown}`);
    disableLinks();

    GLOBAL_INTERVALCOUNTDOWN = setInterval(() => {
        duration--;
        if (duration > 0) {
            setLabel(`${duration} ${GLOBAL_LABELS.cooldown}`);
            disableLinks();
        } else {
            GLOBAL_ISCOUNTDOWNSTARTED = false;
            setLabel(GLOBAL_LABELS.labelActive);
            enableLinks();
            clearInterval(GLOBAL_INTERVALCOUNTDOWN);
        }
    }, 1000);
}

function updateDOM() {
    if (GLOBAL_TIMECURRENT < GLOBAL_TIMES.phase1Start) {
        const { hours, minutes, seconds } = formatTime(GLOBAL_TIMES.phase1Start - GLOBAL_TIMECURRENT);
        GLOBAL.phase = 0;
        setTimer(GLOBAL_LABELS.timerPre.replace('{h}', hours).replace('{m}', minutes).replace('{s}', seconds));
        disableLinks();
        displayTutorial('0');
        setLabel(GLOBAL_LABELS.labelPre);
    } else if (GLOBAL_TIMECURRENT >= GLOBAL_TIMES.phase1Start && GLOBAL_TIMECURRENT < GLOBAL_TIMES.phase2Start) {
        const { hours, minutes, seconds } = formatTime(GLOBAL_TIMES.phase2Start - GLOBAL_TIMECURRENT);
        GLOBAL.phase = 1;
        setTimer(GLOBAL_LABELS.timerPhase1.replace('{h}', hours).replace('{m}', minutes).replace('{s}', seconds));
        if (!GLOBAL_ISCOUNTDOWNSTARTED) {
            setLabel(GLOBAL_LABELS.labelActive);
            enableLinks();
        }
        displayTutorial('1');
    } else if (GLOBAL_TIMECURRENT >= GLOBAL_TIMES.phase2Start) {
        const { hours, minutes, seconds } = formatTime(GLOBAL_TIMES.phase2End - GLOBAL_TIMECURRENT);
        GLOBAL.phase = 2;
        setTimer(GLOBAL_LABELS.timerPhase2.replace('{h}', hours).replace('{m}', minutes).replace('{s}', seconds));
        if (!GLOBAL_ISCOUNTDOWNSTARTED) {
            setLabel(GLOBAL_LABELS.labelActive);
            enableLinks();
        }
        displayTutorial('2');
    }
}

async function init() {
    disableLinks();
    displayTutorial('0');
    setLabel(GLOBAL_LABELS.labelPreFetch);

    await Promise.all([fetchTime(), fetchTweet()]);

    if (!GLOBAL_INTERVALINIT) {
        GLOBAL_INTERVALINIT = setInterval(() => {
            GLOBAL_TIMECURRENT = new Date(GLOBAL_TIMECURRENT.getTime() + 1000);
            updateDOM();
        }, 1000);
    }

    if (!GLOBAL_INTERVALFETCH) {
        GLOBAL_INTERVALFETCH = setInterval(fetchTime, 300000);
    }

    setDOM();
}
init();
