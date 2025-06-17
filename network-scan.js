const readline = require('readline');
const { exec } = require('child_process');

function pingIP(ip) {
    return new Promise((resolve) => {
        exec(`ping -n 1 -w 100 ${ip}`, (err, stdout) => {
            // 不管成功失敗都resolve，讓掃描繼續
            resolve();
        });
    });
}

function getARPTable() {
    return new Promise((resolve, reject) => {
        exec('arp -a', (err, stdout) => {
            if (err) return reject(err);
            resolve(stdout);
        });
    });
}

function parseARP(data, subnet) {
    const lines = data.split('\n');
    const devices = [];

    lines.forEach(line => {
        line = line.trim();
        // Windows arp格式示例: 192.168.1.1          00-11-22-33-44-55     dynamic
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            const ip = parts[0];
            const mac = parts[1];
            // 篩選出指定子網的IP且MAC看起來正常
            if (ip.startsWith(subnet + '.') && mac.match(/^([0-9a-f]{2}-){5}[0-9a-f]{2}$/i)) {
                devices.push({ ip, mac });
            }
        }
    });

    return devices;
}

async function scanSubnet(subnet) {
    console.log(`📡 開始掃描子網：${subnet}.1 ~ ${subnet}.254 ...`);

    // 依序 ping 子網內所有IP，觸發更新 ARP 表
    for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        await pingIP(ip);
    }

    // ping 完後讀取 arp 快取
    const arpData = await getARPTable();

    // 解析結果
    const devices = parseARP(arpData, subnet);

    console.log('\n📋 掃描結果：\n');
    devices.forEach(dev => {
        console.log(`✅ IP: ${dev.ip} - MAC: ${dev.mac}`);
    });
}

// 主程式，等待使用者輸入子網
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('請輸入子網 (例如 192.168.1): ', async (subnet) => {
    await scanSubnet(subnet.trim());
    rl.close();
});
