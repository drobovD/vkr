const fs = require('fs')

fs.readFile('users.json', function(err, data) {
    const users = JSON.parse(data)
    const result = []
    for (const user of users) {
        const arr = []
        for (const value of Object.values(user)) {
            if (value === null) {
                arr.push('NULL')
            } else {
                arr.push(`'${value}'`)
            }
        }
        result.push(`(${arr.join(',')})`)
    }
    console.log(result.join(',\n'))
})