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

        const [id, title, date, time, maxPlaces] = workshop

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
            time,
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



async function archiveWorkshop(workshopId) {

    try {

        const client =
            await auth.getClient()

        // 1. Получаем мастер-классы

        const workshopsResponse =
            await sheets.spreadsheets.values.get({

                auth: client,

                spreadsheetId:
                    process.env.SPREADSHEET_ID,

                range: 'workshops!A2:E'
            })

        const workshops =
            workshopsResponse.data.values || []

        // 2. Находим нужный мастер-класс

        const workshop =
            workshops.find(w => w[0] === workshopId)

        if (!workshop) {

            throw new Error(
                'Мастер-класс не найден'
            )
        }

        const [
            id,
            title,
            date,
            time,
            maxPlaces
        ] = workshop

        // 3. Получаем registrations

        const registrationsResponse =
            await sheets.spreadsheets.values.get({

                auth: client,

                spreadsheetId:
                    process.env.SPREADSHEET_ID,

                range: 'registrations!A2:D'
            })

        const registrations =
            registrationsResponse.data.values || []

        // 4. Фильтруем участников этого МК

        const workshopRegistrations =
            registrations.filter(reg =>
                reg[2] === workshopId
            )

        // 5. Архивируем мастер-класс

        await sheets.spreadsheets.values.append({

            auth: client,

            spreadsheetId:
                process.env.SPREADSHEET_ID,

            range:
                'workshops_archive!A:G',

            valueInputOption:
                'USER_ENTERED',

            requestBody: {

                values: [[

                    id,
                    title,
                    date,
                    time,
                    maxPlaces,

                    workshopRegistrations.length,

                    new Date().toLocaleString()
                ]]
            }
        })

        // 6. Архивируем registrations

        for (const reg of workshopRegistrations) {

            const [
                clientName,
                phone,
                regWorkshopId,
                telegramId
            ] = reg

            await sheets
                .spreadsheets
                .values
                .append({

                    auth: client,

                    spreadsheetId:
                        process.env.SPREADSHEET_ID,

                    range:
                        'registrations_archive!A:F',

                    valueInputOption:
                        'USER_ENTERED',

                    requestBody: {

                        values: [[

                            regWorkshopId,
                            clientName,
                            phone,
                            telegramId,
                            title,

                            new Date()
                                .toLocaleString()
                        ]]
                    }
                })
        }
        // 7. Удаляем мастер-класс
        // из active workshops

        const updatedWorkshops =
            workshops.filter(w =>
                w[0] !== workshopId
            )

        await sheets.spreadsheets.values.update({

            auth: client,

            spreadsheetId:
                process.env.SPREADSHEET_ID,

            range: 'workshops!A2:E',

            valueInputOption:
                'USER_ENTERED',

            requestBody: {

                values: updatedWorkshops
            }
        })

        // 8. Удаляем registrations
        // этого мастер-класса

        const updatedRegistrations =
            registrations.filter(reg =>
                reg[2] !== workshopId
            )

        await sheets.spreadsheets.values.update({

            auth: client,

            spreadsheetId:
                process.env.SPREADSHEET_ID,

            range: 'registrations!A2:D',

            valueInputOption:
                'USER_ENTERED',

            requestBody: {

                values:
                    updatedRegistrations
            }
        })
        
        console.log(
            'ARCHIVE COMPLETED'
        )

    } catch (error) {

        console.log(
            'ARCHIVE ERROR'
        )

        console.log(error)
    }
}

module.exports = {
    getWorkshops,
    addRegistration,
    archiveWorkshop
}