const fs = require('fs')
const path = require('path')
const amount_paid_usd = 5.00
const tokens = fs.readFileSync(path.join(__dirname, '../tokens.txt')).toString().split(',')
    ; (async () => {
        for (let amount = 0; amount <= amount_paid_usd; amount += .5) {
            for (const token of tokens) {
                const stamp = Date.now()
                // send slack msg over http
                await Promise.all([fetch(`https://slack.com/api/chat.postMessage`, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    method: "POST",
                    body: JSON.stringify({
                        channel: "U07L45W79E1",
                        text: `pingy <@U07L45W79E1>`,
                    }),
                }).then(r => r.json()),
                fetch(`https://slack.com/api/chat.postMessage`, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    method: "POST",
                    body: JSON.stringify({
                        channel: "C094KL52E8G",
                        text: `pingy <@U07L45W79E1>`,
                    }),
                }).then(r => r.json())])
                console.log(`Send on ${token} , took ${Date.now() - stamp}ms`)
                await new Promise(resolve => setTimeout(resolve, 100)) // wait .1 second between requests
            }
            await new Promise(resolve => setTimeout(resolve, 5000)) // wait 1 second between amounts
        }
    })()