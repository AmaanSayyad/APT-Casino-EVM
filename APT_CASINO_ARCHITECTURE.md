# APT Casino - System Architecture Diagram

```mermaid
flowchart LR
    subgraph Client["Client Applications"]
        WEB["Web App<br/>Next.js 15"]
        MOBILE["Mobile Web<br/>PWA Ready"]
        WALLET["Wallet Connectors<br/>MetaMask/WalletConnect"]
    end

    subgraph Frontend["Frontend Layer"]
        UI["React Components<br/>Material-UI + Tailwind"]
        GAMES["Game Engines<br/>Three.js + Matter.js"]
        STATE["State Management<br/>Redux + React Query"]
        WALLET_MGR["Wallet Manager<br/>RainbowKit + Wagmi"]
    end

    subgraph Backend["Backend Services"]
        API["Next.js API Routes<br/>(REST Endpoints)"]
        VRF_API["VRF Service<br/>Batch Generation"]
        GAME_API["Game Logic<br/>Results & Validation"]
        DB["PostgreSQL<br/>User Data + History"]
        CACHE["Redis Cache<br/>Sessions + Game State"]
    end

    subgraph Blockchain["Arbitrum Network"]
        ARB["Arbitrum Sepolia<br/>(Testnet)"]
        CONTRACT["CasinoVRFConsumer<br/>Smart Contract"]
        VRF["Chainlink VRF v2<br/>Random Generation"]
        COORD["VRF Coordinator<br/>0x6D80646bE..."]
    end

    subgraph Games["Game Types"]
        MINES["Mines Game<br/>Grid-based Strategy"]
        PLINKO["Plinko Game<br/>Physics Simulation"]
        ROULETTE["Roulette Game<br/>Classic Casino"]
        WHEEL["Wheel Game<br/>Prize Spinner"]
    end

    subgraph External["External Services"]
        CHAINLINK["Chainlink Network<br/>VRF Nodes"]
        ARBISCAN["Arbiscan API<br/>Contract Verification"]
        LINK_TOKEN["LINK Token<br/>VRF Payments"]
    end

    %% Client to Frontend connections
    WEB --> UI
    MOBILE --> UI
    WALLET --> WALLET_MGR

    %% Frontend internal connections
    UI --> STATE
    UI --> GAMES
    WALLET_MGR --> STATE
    GAMES --> STATE

    %% Frontend to Backend connections
    STATE --> API
    GAMES --> VRF_API
    API --> GAME_API

    %% Backend internal connections
    API --> DB
    API --> CACHE
    VRF_API --> DB
    GAME_API --> CACHE

    %% Backend to Blockchain connections
    VRF_API --> CONTRACT
    GAME_API --> CONTRACT
    CONTRACT --> VRF
    VRF --> COORD

    %% Blockchain to External connections
    VRF --> CHAINLINK
    CONTRACT --> ARBISCAN
    COORD --> LINK_TOKEN

    %% Games connections
    GAMES --> MINES
    GAMES --> PLINKO
    GAMES --> ROULETTE
    GAMES --> WHEEL

    %% External service connections
    CHAINLINK --> VRF
    ARB --> CONTRACT

    %% Styling
    classDef clientStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontendStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef backendStyle fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef blockchainStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gameStyle fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef externalStyle fill:#f1f8e9,stroke:#33691e,stroke-width:2px

    class WEB,MOBILE,WALLET clientStyle
    class UI,GAMES,STATE,WALLET_MGR frontendStyle
    class API,VRF_API,GAME_API,DB,CACHE backendStyle
    class ARB,CONTRACT,VRF,COORD blockchainStyle
    class MINES,PLINKO,ROULETTE,WHEEL gameStyle
    class CHAINLINK,ARBISCAN,LINK_TOKEN externalStyle
```

## 🎯 Architecture Components

### Client Layer
- **Web App**: Next.js 15 with App Router for modern web experience
- **Mobile Web**: PWA-ready responsive design for mobile users
- **Wallet Connectors**: Support for MetaMask, WalletConnect, and other Web3 wallets

### Frontend Layer
- **React Components**: Material-UI and Tailwind CSS for modern UI/UX
- **Game Engines**: Three.js for 3D graphics, Matter.js for physics simulation
- **State Management**: Redux Toolkit with React Query for efficient data management
- **Wallet Manager**: RainbowKit and Wagmi v2 for seamless wallet integration

### Backend Services
- **Next.js API Routes**: RESTful endpoints for game operations
- **VRF Service**: Batch random number generation management
- **Game Logic**: Result validation and game state management
- **PostgreSQL**: Persistent storage for user data and game history
- **Redis Cache**: High-performance caching for sessions and game states

### Blockchain Layer
- **Arbitrum Sepolia**: Layer 2 testnet for development and testing
- **CasinoVRFConsumer**: Custom smart contract for casino operations
- **Chainlink VRF v2**: Verifiable random function for provably fair gaming
- **VRF Coordinator**: Chainlink's coordinator contract for VRF requests

### Game Types
- **Mines**: Strategic grid-based game with hidden mines
- **Plinko**: Physics-based ball drop game with multipliers
- **Roulette**: Classic casino roulette with multiple betting options
- **Wheel**: Customizable prize wheel with various segments

### External Services
- **Chainlink Network**: Decentralized oracle network for randomness
- **Arbiscan API**: Blockchain explorer for contract verification
- **LINK Token**: Payment token for Chainlink VRF services

## 🔄 Data Flow Summary

1. **User Interaction**: Users interact through web/mobile clients
2. **Wallet Connection**: RainbowKit manages wallet connectivity
3. **Game Selection**: Frontend routes to specific game engines
4. **VRF Request**: Backend triggers smart contract for randomness
5. **Blockchain Processing**: Chainlink VRF generates verifiable random numbers
6. **Result Processing**: Smart contract processes results and emits events
7. **State Update**: Frontend updates game state and user interface
8. **Data Persistence**: Results stored in PostgreSQL with Redis caching

## 🛡️ Security Features

- **Provably Fair Gaming**: Chainlink VRF ensures cryptographically secure randomness
- **Smart Contract Security**: Access controls and treasury-only functions
- **Wallet Security**: Non-custodial design with user-controlled private keys
- **Network Security**: Arbitrum's Layer 2 security inherited from Ethereum