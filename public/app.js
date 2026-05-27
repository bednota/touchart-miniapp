
let telegramUser = null

if (window.Telegram?.WebApp) {

    const tg = window.Telegram.WebApp

    tg.expand()

    telegramUser =
        tg.initDataUnsafe.user

    console.log(telegramUser)
}

const API_URL =
    'https://touchart-miniapp.onrender.com'

let selectedWorkshopId = ''

async function loadWorkshops() {

    try {

        console.log('LOADING WORKSHOPS')

        const response = await fetch(
            `${API_URL}/workshops`
        )

        console.log('FETCH COMPLETED')

        const workshops =
            await response.json()

        console.log(workshops)

        const workshopsContainer =
            document.getElementById('workshops')

        workshopsContainer.innerHTML = ''

        workshops.forEach(workshop => {

            const [
                id,
                title,
                date,
                time,
                places
            ] = workshop

            const card =
                document.createElement('div')

            card.className = 'workshop-card'

            card.innerHTML = `

                <h2>${title}</h2>

                <p>Дата: ${date}</p>
                <p>Время: ${time}</p>

                <p>Свободных мест: ${places}</p>

                <button
                    class="register-btn"
                    ${places <= 0 ? 'disabled' : ''}
                >
                    ${places <= 0
                        ? 'Мест нет'
                        : 'Записаться'}
                </button>
            `

            const button =
                card.querySelector('button')

            button.addEventListener('click', () => {

                selectedWorkshopId = id

                const name =
                    telegramUser?.first_name ||
                prompt('Введите имя')

                const phone =
                    prompt('Введите телефон')

                register(name, phone)
            })

            workshopsContainer.appendChild(card)
        })

    } catch (error) {

        console.log(error)

        document.getElementById('workshops')
            .innerHTML = `
                <h2>
                    Ошибка загрузки
                </h2>
            `
    }
}

async function register(name, phone) {

    try {

        const response = await fetch(
            `${API_URL}/register`,
            {

                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({

                    name,
                    phone,

                    workshopId:
                        selectedWorkshopId,

                    telegramId:
                        telegramUser?.id || ''
                })
            }
        )

        if (!response.ok) {

            const error =
                await response.text()

            alert(error)

            return
        }

        alert('Вы успешно записаны')

        loadWorkshops()

    } catch (error) {

        console.log(error)

        alert('Ошибка регистрации')
    }
}

window.onload = () => {

    console.log('WINDOW LOADED')

    loadWorkshops()
}