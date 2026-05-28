const { google } = require('googleapis')

const auth = new google.auth.GoogleAuth({

    keyFile: 'credentials.json',

    scopes: [
        'https://www.googleapis.com/auth/spreadsheets'
    ]
})

const sheets =
    google.sheets('v4')

// =========================
// CACHE
// =========================

let workshopsCache = []

let lastFetchTime = 0

const CACHE_DURATION = 60000

// =========================
// GET WORKSHOPS
// =========================

async function getWorkshops() {

    try {

        // CACHE

        const now = Date.now()

        if (

            workshopsCache.length > 0 &&

            now - lastFetchTime <
            CACHE_DURATION

        ) {

            console.log(
                'CACHE USED'
            )

            return workshopsCache
        }

        const client =
            await auth.getClient()

        // =========================
        // WORKSHOPS
        // =========================

        const workshopsResponse =
            await sheets
                .spreadsheets
                .values
                .get({

                    auth: client,

                    spreadsheetId:
                        process.env.SPREADSHEET_ID,

                    range:
                        'workshops!A2:E'
                })

        const workshops =
            workshopsResponse
                .data
                .values || []

        // =========================
        // REGISTRATIONS
        // =========================

        const registrationsResponse =
            await sheets
                .spreadsheets
                .values
                .get({

                    auth: client,

                    spreadsheetId:
                        process.env.SPREADSHEET_ID,

                    range:
                        'registrations!A2:E'
                })

        const registrations =
            registrationsResponse
                .data
                .values || []

        // =========================
        // CALCULATE FREE PLACES
        // =========================

        const formattedWorkshops =
            workshops.map(workshop => {

                const [
                    id,
                    title,
                    date,
                    time,
                    maxPlaces
                ] = workshop

                const workshopRegistrations =

                    registrations.filter(
                        reg =>
                            reg[2] === id
                    )

                // =========================
                // OCCUPIED PLACES
                // =========================

                const occupiedPlaces =

                    workshopRegistrations.reduce(

                        (sum, reg) => {

                            return (
                                sum +
                                Number(
                                    reg[4] || 1
                                )
                            )
                        },

                        0
                    )

                const freePlaces =

                    Number(maxPlaces) -

                    occupiedPlaces

                return [

                    id,
                    title,
                    date,
                    time,
                    freePlaces
                ]
            })

        // =========================
        // CACHE SAVE
        // =========================

        workshopsCache =
            formattedWorkshops

        lastFetchTime =
            Date.now()

        console.log(
            'WORKSHOPS LOADED'
        )

        return formattedWorkshops

    } catch (error) {

        console.log(
            'GET WORKSHOPS ERROR'
        )

        console.log(error)

        return []
    }
}

// =========================
// ADD REGISTRATION
// =========================

async function addRegistration(

    name,
    phone,
    workshopId,
    telegramId,
    peopleCount

) {

    try {

        const client =
            await auth.getClient()

        await sheets
            .spreadsheets
            .values
            .append({

                auth: client,

                spreadsheetId:
                    process.env.SPREADSHEET_ID,

                range:
                    'registrations!A:E',

                valueInputOption:
                    'USER_ENTERED',

                requestBody: {

                    values: [[

                        name,
                        phone,
                        workshopId,
                        telegramId,
                        peopleCount
                    ]]
                }
            })

        // RESET CACHE

        workshopsCache = []

        console.log(
            'REGISTRATION CREATED'
        )

    } catch (error) {

        console.log(
            'ADD REGISTRATION ERROR'
        )

        console.log(error)
    }
}

// =========================
// ARCHIVE WORKSHOP
// =========================

async function archiveWorkshop(
    workshopId
) {

    try {

        const client =
            await auth.getClient()

        // =========================
        // GET WORKSHOPS
        // =========================

        const workshopsResponse =
            await sheets
                .spreadsheets
                .values
                .get({

                    auth: client,

                    spreadsheetId:
                        process.env.SPREADSHEET_ID,

                    range:
                        'workshops!A2:E'
                })

        const workshops =
            workshopsResponse
                .data
                .values || []

        // =========================
        // FIND WORKSHOP
        // =========================

        const workshop =
            workshops.find(
                w => w[0] === workshopId
            )

        if (!workshop) {

            throw new Error(
                'Workshop not found'
            )
        }

        const [
            id,
            title,
            date,
            time,
            maxPlaces
        ] = workshop

        // =========================
        // GET REGISTRATIONS
        // =========================

        const registrationsResponse =
            await sheets
                .spreadsheets
                .values
                .get({

                    auth: client,

                    spreadsheetId:
                        process.env.SPREADSHEET_ID,

                    range:
                        'registrations!A2:E'
                })

        const registrations =
            registrationsResponse
                .data
                .values || []

        // =========================
        // FILTER REGISTRATIONS
        // =========================

        const workshopRegistrations =

            registrations.filter(
                reg =>
                    reg[2] === workshopId
            )

        // =========================
        // CALCULATE PARTICIPANTS
        // =========================

        const actualParticipants =

            workshopRegistrations.reduce(

                (sum, reg) => {

                    return (
                        sum +
                        Number(
                            reg[4] || 1
                        )
                    )
                },

                0
            )

        // =========================
        // ARCHIVE WORKSHOP
        // =========================

        await sheets
            .spreadsheets
            .values
            .append({

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
                        actualParticipants,

                        new Date()
                            .toLocaleString()
                    ]]
                }
            })

        // =========================
        // ARCHIVE REGISTRATIONS
        // =========================

        for (
            const reg
            of workshopRegistrations
        ) {

            const [

                clientName,
                phone,
                regWorkshopId,
                telegramId,
                peopleCount

            ] = reg

            await sheets
                .spreadsheets
                .values
                .append({

                    auth: client,

                    spreadsheetId:
                        process.env.SPREADSHEET_ID,

                    range:
                        'registrations_archive!A:G',

                    valueInputOption:
                        'USER_ENTERED',

                    requestBody: {

                        values: [[

                            regWorkshopId,
                            clientName,
                            phone,
                            telegramId,
                            peopleCount,
                            title,

                            new Date()
                                .toLocaleString()
                        ]]
                    }
                })
        }

        // =========================
        // REMOVE FROM ACTIVE
        // =========================

        const updatedWorkshops =

            workshops.filter(
                w =>
                    w[0] !== workshopId
            )

        await sheets
            .spreadsheets
            .values
            .update({

                auth: client,

                spreadsheetId:
                    process.env.SPREADSHEET_ID,

                range:
                    'workshops!A2:E',

                valueInputOption:
                    'USER_ENTERED',

                requestBody: {

                    values:
                        updatedWorkshops
                }
            })

        // =========================
        // REMOVE REGISTRATIONS
        // =========================

        const updatedRegistrations =

            registrations.filter(
                reg =>
                    reg[2] !== workshopId
            )

        await sheets
            .spreadsheets
            .values
            .update({

                auth: client,

                spreadsheetId:
                    process.env.SPREADSHEET_ID,

                range:
                    'registrations!A2:E',

                valueInputOption:
                    'USER_ENTERED',

                requestBody: {

                    values:
                        updatedRegistrations
                }
            })

        // RESET CACHE

        workshopsCache = []

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

// =========================
// EXPORTS
// =========================

module.exports = {

    getWorkshops,

    addRegistration,

    archiveWorkshop
}