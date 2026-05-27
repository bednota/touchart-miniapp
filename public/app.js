const tg = window.Telegram.WebApp

tg.expand()

console.log(tg.initDataUnsafe)

let selectedWorkshopId = ''

const workshopList = document.querySelector('.workshop-list')

const loading = document.querySelector('.loading')

const modal = document.querySelector('.modal')

const submitBtn = document.getElementById('submitBtn')

async function loadWorkshops() {

    try {

        loading.style.display = 'block'

        workshopList.innerHTML = ''

        console.log('LOADING WORKSHOPS')

        const response = await fetch('https://touchart-miniapp.onrender.com/workshops', {
            method: 'GET',
            cache: 'no-store'
        })

        console.log('RESPONSE RECEIVED')

        const workshops = await response.json()

        console.log(workshops)

        loading.style.display = 'none'

        workshops.forEach(workshop => {

            const [id, title, date, places] = workshop

            const card = document.createElement('div')

            card.className = 'workshop-card'

            card.innerHTML = `
                <h2>${title}</h2>

                <p>Дата: ${date}</p>

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
                card.querySelector('.register-btn')

            button.addEventListener('click', () => {

                selectedWorkshopId = id

                modal.classList.remove('hidden')
            })

            workshopList.appendChild(card)
        })

    } catch (error) {

        console.log(error)

        loading.innerHTML =
            'Ошибка загрузки мастер-классов'
    }
}

submitBtn.addEventListener('click', async () => {

    const name =
        document.getElementById('name').value

    const phone =
        document.getElementById('phone').value

    try {

        await fetch('https://touchart-miniapp.onrender.com/register', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                name,
                phone,
                workshopId: selectedWorkshopId
            })
        })

        alert('Вы успешно записаны!')

        modal.classList.add('hidden')

    } catch (error) {

        console.log(error)

        alert('Ошибка регистрации')
    }
})

window.onload = () => {
    loadWorkshops()
}