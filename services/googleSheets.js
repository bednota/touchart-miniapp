const { google } = require('googleapis')

const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
})

const sheets = google.sheets({
    version: 'v4',
    auth
})

let workshopsCache = []

let lastFetchTime = 0

const CACHE_DURATION = 60000

async function getWorkshops() {

    const client = await auth.getClient()

    // Получаем мастер-классы
    const workshopsResponse =
        await sheets.spreadsheets.values.get({

            auth: client,

            spreadsheetId:
                process.env.SPREADSHEET_ID,

            range: 'workshops!A2:D'
        })

    // Получаем регистрации
    const registrationsResponse =
        await sheets.spreadsheets.values.get({

            auth: client,

            spreadsheetId:
                process.env.SPREADSHEET_ID,

            range: 'registrations!A2:C'
        })

    const workshops =
        workshopsResponse.data.values || []

    const registrations =
        registrationsResponse.data.values || []

    // Считаем свободные места
    const result = workshops.map(workshop => {

        const [id, title, date, maxPlaces] = workshop

        const registrationsCount =
            registrations.filter(reg => {

                return reg[2] === id

            }).length

        const freePlaces =
            parseInt(maxPlaces) - registrationsCount

        return [
            id,
            title,
            date,
            freePlaces
        ]
    })

    return result
}

async function addRegistration(
    name,
    phone,
    workshopId,
    telegramId
) {

    await sheets.spreadsheets.values.append({

        spreadsheetId: process.env.SPREADSHEET_ID,

        range: 'registrations!A:C',

        valueInputOption: 'USER_ENTERED',

        requestBody: {

            values: [
                [name, phone, workshopId, telegramId]
            ]
        }
    })
    //console.log(name)
    //console.log(phone)
    //console.log(workshopId)
}


module.exports = {
    getWorkshops,
    addRegistration
}