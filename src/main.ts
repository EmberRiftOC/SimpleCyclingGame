import './style.css'

// Simple Hello World - ready to build a game!
const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="container">
    <h1>Hello World! 🎮</h1>
    <p>Your game will go here.</p>
    <p class="info">Built with TypeScript + Vite, deployed on Vercel</p>
  </div>
`

console.log('Game initialized!')
