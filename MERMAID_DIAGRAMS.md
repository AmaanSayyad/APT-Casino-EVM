# APT Casino - Mermaid Architecture Diagrams

## 🏗️ System Architecture Overview

```mermaid
graph TB
    subgraph Frontend["Frontend Layer"]
        A[Next.js App] --> B[React Components]
        B --> C[Three.js Games]
        B --> D[Material-UI]
        B --> E[RainbowKit Wallet]
    end
    
    subgraph State["State Management"]
        F[Redux Store] --> G[React Query]
        G --> H[Local State]
    end
    
    subgraph API["API Layer"]
        I[Next.js API Routes] --> J[VRF Endpoints]
        I --> K[Deposit/Withdraw]
        I --> L[Game Logic]
    end
    
    subgraph Blockchain["Blockchain Layer"]
        M[Arbitrum Sepolia] --> N[CasinoVRFConsumer]
        N --> O[Chainlink VRF v2]
        O --> P[VRF Coordinator]
    end
    
    subgraph Data["Data Layer"]
        Q[PostgreSQL] --> R[User Data]
        S[Redis Cache] --> T[Session Data]
        S --> U[Game State]
    end
    
    A --> F
    B --> I
    I --> M
    I --> Q
    I --> S
    N --> I
```

## 🔄 Application Bootstrap Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant N as Next.js
    participant P as Providers
    participant W as Wagmi
    participant R as RainbowKit
    
    U->>B: Access Application
    B->>N: Load App Router
    N->>P: Initialize Providers
    P->>W: Setup Wagmi Config
    W->>R: Initialize RainbowKit
    R->>P: Wallet UI Ready
    P->>N: Providers Ready
    N->>B: Render Application
    B->>U: Display UI
```

## 🔗 Wallet Connection Flow

```mermaid
flowchart TD
    A[User Clicks Connect] --> B{Wallet Available?}
    B -->|Yes| C[RainbowKit Modal]
    B -->|No| D[Install Wallet Prompt]
    
    C --> E[Select Wallet Type]
    E --> F[MetaMask]
    E --> G[WalletConnect]
    E --> H[Coinbase Wallet]
    E --> I[Trust Wallet]
    E --> J[Other Wallets]
    
    F --> K[Request Connection]
    G --> K
    H --> K
    I --> K
    J --> K
    
    K --> L{Network Check}
    L -->|Arbitrum Sepolia| M[Connection Success]
    L -->|Wrong Network| N[Switch Network]
    
    N --> O{User Approves?}
    O -->|Yes| M
    O -->|No| P[Connection Failed]
    
    M --> Q[Update App State]
    Q --> R[Enable Game Features]
```

## 🎲 VRF Integration Architecture

```mermaid
graph LR
    subgraph Frontend["Frontend"]
        A[Game Component] --> B[VRF Request]
    end
    
    subgraph Contract["Smart Contract"]
        C[CasinoVRFConsumer] --> D[requestRandomWords]
        D --> E[VRF Coordinator]
    end
    
    subgraph Chainlink["Chainlink Network"]
        F[Chainlink Node] --> G[Generate Random]
        G --> H[Cryptographic Proof]
    end
    
    subgraph Callback["Callback Flow"]
        I[fulfillRandomWords] --> J[Update Game State]
        J --> K[Emit Events]
    end
    
    B --> C
    E --> F
    H --> I
    K --> A
```

## 🎮 Game Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Game UI
    participant API as API Route
    participant SC as Smart Contract
    participant VRF as Chainlink VRF
    participant DB as Database
    
    U->>UI: Start Game
    UI->>API: POST /api/game/start
    API->>SC: requestRandomWords()
    SC->>VRF: Request Random Number
    
    Note over VRF: Generate Cryptographic Random
    
    VRF->>SC: fulfillRandomWords()
    SC->>API: Event: VRFFulfilled
    API->>DB: Store Game Result
    API->>UI: Game Result
    UI->>U: Display Outcome
```

## 🏗️ Smart Contract Deployment Flow

```mermaid
flowchart TD
    A[Environment Setup] --> B[Load .env.local]
    B --> C[Hardhat Compilation]
    C --> D[Deploy Script]
    
    D --> E{VRF Subscription?}
    E -->|No| F[Create Subscription]
    E -->|Yes| G[Use Existing]
    
    F --> H[Fund with LINK]
    G --> I[Deploy Contract]
    H --> I
    
    I --> J[Verify on Arbiscan]
    J --> K[Add Consumer]
    K --> L[Save Deployment Info]
    
    L --> M[Test VRF Function]
    M --> N{Test Success?}
    N -->|Yes| O[Deployment Complete]
    N -->|No| P[Debug & Retry]
```

## 🎯 Game-Specific Flows

### Mines Game Flow
```mermaid
stateDiagram-v2
    [*] --> GridSetup
    GridSetup --> BetPlacement
    BetPlacement --> VRFRequest
    VRFRequest --> MineGeneration
    MineGeneration --> GameActive
    
    GameActive --> TileClick
    TileClick --> SafeTile: Safe
    TileClick --> MineTile: Mine Hit
    
    SafeTile --> ContinueGame: Continue
    SafeTile --> CashOut: Cash Out
    
    ContinueGame --> GameActive
    CashOut --> GameEnd
    MineTile --> GameEnd
    
    GameEnd --> [*]
```

### Plinko Game Flow
```mermaid
graph TD
    A[Drop Ball] --> B[Physics Engine]
    B --> C[VRF Randomness]
    C --> D[Peg Collisions]
    D --> E[Ball Path Calculation]
    E --> F[Multiplier Zone]
    F --> G[Payout Calculation]
    
    subgraph Physics["Physics Simulation"]
        H[Matter.js] --> I[Gravity]
        I --> J[Collision Detection]
        J --> K[Bounce Physics]
    end
    
    subgraph Visual["Visual Rendering"]
        L[Three.js] --> M[3D Ball]
        M --> N[Peg Animation]
        N --> O[Trail Effects]
    end
    
    B --> H
    E --> L
```

### Roulette Game Flow
```mermaid
flowchart LR
    A[Place Bets] --> B[Multiple Bet Types]
    B --> C[Red/Black]
    B --> D[Odd/Even]
    B --> E[Numbers]
    B --> F[Columns/Dozens]
    
    C --> G[Spin Wheel]
    D --> G
    E --> G
    F --> G
    
    G --> H[VRF Random 0-36]
    H --> I[Determine Winners]
    I --> J[Calculate Payouts]
    J --> K[Update Balances]
```

## 🔐 Security & Access Control

```mermaid
graph TB
    subgraph Access["Access Control Layers"]
        A[Public Functions] --> B[User Interface]
        C[Treasury Functions] --> D[Game Operations]
        E[Owner Functions] --> F[Admin Operations]
    end
    
    subgraph Contract["Smart Contract Security"]
        G[onlyTreasury Modifier] --> H[requestRandomWords]
        I[onlyOwner Modifier] --> J[updateTreasury]
        I --> K[updateVRFConfig]
        I --> L[withdrawLink]
    end
    
    subgraph Frontend["Frontend Security"]
        M[Wallet Verification] --> N[Network Validation]
        N --> O[Transaction Signing]
        O --> P[Gas Estimation]
    end
    
    D --> G
    F --> I
    B --> M
```

## 📊 Data Flow Architecture

```mermaid
graph LR
    subgraph Actions["User Actions"]
        A[Connect Wallet] --> B[Select Game]
        B --> C[Place Bet]
        C --> D[Game Interaction]
    end
    
    subgraph State["State Management"]
        E[Redux Store] --> F[Global State]
        G[React Query] --> H[Server State]
        I[Local State] --> J[Component State]
    end
    
    subgraph API["API Layer"]
        K[Next.js Routes] --> L[VRF Endpoints]
        K --> M[Game Logic]
        K --> N[User Management]
    end
    
    subgraph Persistence["Data Persistence"]
        O[PostgreSQL] --> P[User Data]
        O --> Q[Game History]
        R[Redis] --> S[Session Cache]
        R --> T[Game State]
    end
    
    D --> E
    E --> K
    K --> O
    K --> R
```

## 🚀 Deployment Pipeline

```mermaid
gitGraph
    commit id: "Initial Setup"
    branch development
    checkout development
    commit id: "Smart Contracts"
    commit id: "Frontend Components"
    commit id: "API Routes"
    
    branch feature/vrf-integration
    checkout feature/vrf-integration
    commit id: "VRF Setup"
    commit id: "Game Logic"
    
    checkout development
    merge feature/vrf-integration
    commit id: "Integration Tests"
    
    branch staging
    checkout staging
    merge development
    commit id: "Staging Deploy"
    commit id: "User Testing"
    
    checkout main
    merge staging
    commit id: "Production Deploy"
    commit id: "Mainnet Contracts"
```

## 🔄 Request-Response Cycle

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant S as Smart Contract
    participant V as VRF
    participant D as Database
    
    U->>F: Game Action
    F->>A: API Request
    A->>S: Contract Call
    S->>V: VRF Request
    
    Note over V: Generate Random
    
    V->>S: Fulfill Random
    S->>A: Event Emission
    A->>D: Store Result
    A->>F: Response
    F->>U: Update UI
```

## 🎨 Frontend Component Architecture

```mermaid
graph TD
    subgraph Layout["App Layout"]
        A[RootLayout] --> B[Providers]
        B --> C[Navbar]
        B --> D[Main Content]
        B --> E[Footer]
    end
    
    subgraph Games["Game Components"]
        F[GameCarousel] --> G[MinesGame]
        F --> H[PlinkoGame]
        F --> I[RouletteGame]
        F --> J[WheelGame]
    end
    
    subgraph Shared["Shared Components"]
        K[WalletManager] --> L[ConnectButton]
        M[NotificationSystem] --> N[Toast Messages]
        O[LoadingSpinner] --> P[Game Loading]
    end
    
    subgraph ThreeD["3D Components"]
        Q[Three.js Canvas] --> R[PlinkoBoard]
        Q --> S[RouletteWheel]
        Q --> T[GameEffects]
    end
    
    D --> F
    D --> K
    D --> M
    G --> Q
    H --> Q
    I --> Q
```

## 🔧 Development Workflow

```mermaid
flowchart TD
    A[Local Development] --> B[Hot Reload]
    B --> C[Component Changes]
    C --> D[Contract Changes]
    
    D --> E[Hardhat Compile]
    E --> F[Local Testing]
    F --> G{Tests Pass?}
    
    G -->|No| H[Fix Issues]
    H --> E
    G -->|Yes| I[Commit Changes]
    
    I --> J[Push to GitHub]
    J --> K[CI/CD Pipeline]
    K --> L[Automated Tests]
    
    L --> M{All Tests Pass?}
    M -->|No| N[Fix & Retry]
    M -->|Yes| O[Deploy to Staging]
    
    O --> P[Manual Testing]
    P --> Q{Ready for Prod?}
    Q -->|No| R[More Changes]
    Q -->|Yes| S[Production Deploy]
    
    R --> A
    N --> A
```

## 📈 Performance Monitoring

```mermaid
graph LR
    subgraph Frontend["Frontend Metrics"]
        A[Page Load Time] --> B[Bundle Size]
        B --> C[User Interactions]
        C --> D[Error Rates]
    end
    
    subgraph API["API Metrics"]
        E[Response Time] --> F[Throughput]
        F --> G[Error Rates]
        G --> H[Cache Hit Ratio]
    end
    
    subgraph Blockchain["Blockchain Metrics"]
        I[Gas Usage] --> J[Transaction Time]
        J --> K[VRF Latency]
        K --> L[Success Rates]
    end
    
    subgraph Database["Database Metrics"]
        M[Query Performance] --> N[Connection Pool]
        N --> O[Cache Performance]
        O --> P[Storage Usage]
    end
    
    D --> Q[Monitoring Dashboard]
    H --> Q
    L --> Q
    P --> Q
```

## 🎯 User Journey Flow

```mermaid
journey
    title User Gaming Experience
    section Discovery
      Visit Website: 5: User
      Browse Games: 4: User
      Read About Fairness: 3: User
    section Onboarding
      Connect Wallet: 3: User
      Switch Network: 2: User
      Verify Connection: 4: User
    section Gaming
      Select Game: 5: User
      Place Bet: 4: User
      Wait for Result: 2: User
      See Outcome: 5: User
    section Continuation
      Play Again: 4: User
      Try Different Game: 3: User
      Cash Out: 4: User
```

This comprehensive set of Mermaid diagrams provides visual representations of all major architectural components and flows in the APT Casino application, making it easier to understand the complex interactions between different system layers.