import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Watermark Tool</h1>
      <p>Project initialized with Vite, React, and TypeScript.</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Click count: {count}
      </button>
    </div>
  )
}

export default App
