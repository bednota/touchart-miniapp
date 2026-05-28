
const {
    getWorkshops,
    addRegistration,
    archiveWorkshop,
    decreasePlaces
} = require('./services/googleSheets')

require('dotenv').config()



const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
    res.send('TouchART server works')
})

app.get('/workshops', async (req, res) => {

    try {

        const workshops = await getWorkshops()

        res.json(workshops)

    } catch (error) {

        console.log(error)

        res.status(500).send('Error loading workshops')
    }
})

const PORT = 3000

app.post('/register', async (req, res) => {

    try {

        const {
            name,
            phone,
            workshopId,
            telegramId
        } = req.body

        //await decreasePlaces(workshopId)

        await addRegistration(
            name,
            phone,
            workshopId,
            telegramId
        )

        res.send('Registration successful')

    } catch (error) {

        console.log(error)

        res.status(500).send('Registration error')
    }
})

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})

app.get(
    '/archive/:id',

    async (req, res) => {

        try {

            const workshopId =
                req.params.id

            await archiveWorkshop(
                workshopId
            )

            res.send(
                'Архивирование завершено'
            )

        } catch (error) {

            console.log(error)

            res.status(500).send(
                'Ошибка архивирования'
            )
        }
    }
)
