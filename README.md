# Scribble Game Clone - A Distributed Computing Approach

![Screenshot 2025-05-14 121330](https://github.com/user-attachments/assets/b1537f13-ca23-41d0-8326-da5891d0146b)
![Screenshot 2025-05-14 121416](https://github.com/user-attachments/assets/143eac5a-69a4-40d4-99db-a666299ea684)
![Screenshot 2025-05-14 121506](https://github.com/user-attachments/assets/503e4f07-effe-43a4-805d-7f845cf09bdd)
![Screenshot 2025-05-14 121552](https://github.com/user-attachments/assets/bdd3db73-3bd6-48a3-ad08-20a8b9f21fd3)
![Screenshot 2025-05-14 121642](https://github.com/user-attachments/assets/e3fe95f1-10fd-42a3-b068-9e70014a7cfb)
![Screenshot 2025-05-14 121815](https://github.com/user-attachments/assets/70eed2fb-ea75-49a9-b2ed-c3c1306dc711)
![Screenshot 2025-05-14 121953](https://github.com/user-attachments/assets/4803f6ab-468f-4cb6-a806-c71ce2ab4a78)
![Screenshot 2025-05-14 122015](https://github.com/user-attachments/assets/4fbbd4a8-f99b-4acc-b69b-ab3e396a4271)

## Overview


The Scribble Game Clone is an online multiplayer game designed to demonstrate the application of distributed computing concepts. In this Pictionary-like game, players take turns drawing a word provided by the system, while other players attempt to guess the word in real-time. Points are awarded to the drawer for successful guesses by others, and to guessers for correctly identifying the word. The game proceeds in rounds, and the player with the highest score at the end is the winner.

The primary aim of this project is to design and develop a functional, real-time, multiplayer Scribble game that leverages distributed computing concepts to ensure scalability, reliability, and a consistent user experience.

## Key Features

* **Core Gameplay:** Implementation of the fundamental drawing and guessing mechanics of a Pictionary-like game.
* **User Management:** User registration with avatar customization.
* **Room Management:** Users can create new game rooms or join existing ones.
* **Real-time Shared Canvas:** Players can draw on a shared canvas in real-time.
* **Real-time Chat & Guessing:** A chat interface is available for players to submit their guesses and communicate.
* **Scoring System:** Points are tracked for drawers and guessers.
* **Responsive Frontend:** A user-friendly interface allowing seamless interaction with all game features.

## Distributed Computing Concepts Employed

This project implements several distributed computing techniques:

1. **Real-time Bidirectional Communication & Scalability (Socket.IO with Redis Adapter):**

   * **Functionality:** Socket.IO (built on WebSockets) facilitates persistent, low-latency, bidirectional communication for streaming drawing data, delivering chat messages and guesses, and broadcasting game state changes.
   * **Room-Specific Broadcasting:** Socket.IO's "rooms" feature isolates communication to clients within the same game instance.
   * **Horizontal Scalability:** The `@socket.io/redis-adapter` is used with Redis Pub/Sub to broadcast events across multiple Socket.IO server instances, enabling horizontal scaling and improved resilience.

2. **Asynchronous Event Processing for Analytics (RabbitMQ):**

   * **Decoupling:** Game events (e.g., `user_registered`, `room_created`, `game_started`) are published to a RabbitMQ exchange (`game_events_exchange_v3`) to decouple analytics processing from core game logic.
   * **Message Queue:** A dedicated queue (`scribble_analytics_processor_queue_v1`) receives these events for analytical processing.
   * **Dedicated Consumer:** A separate analytics server or worker process consumes messages asynchronously, storing data in an analytics database.
   * **Benefits:** Ensures core game performance is unaffected by analytics processing, provides message durability, and reliable delivery.

3. **Fault Tolerance in Room Management: Leader Election (Bully Algorithm):**

   * **Problem:** If the creator (host) of a game room in a "waiting" state disconnects, the room can become unmanageable.
   * **Solution:** The Bully Algorithm is implemented to elect a new host from the remaining players.
   * **Mechanism:** When a host's disconnection is detected, an election is initiated. Players (nodes) are identified by their `userId`. A player can initiate an election by sending an `ELECTION` message to players with higher `userIds`. If no response (`OK`) is received, the initiator becomes the leader. If an `OK` is received, the receiver starts its own election. The elected leader notifies all players by sending a `COORDINATOR` message.
   * **Outcome:** The room's `creatorId` in MongoDB is updated, and clients are notified of the new host via a Socket.IO event (`roomCreatorChanged`).

4. **Ensuring Causal Order & State Consistency (Vector Clocks):**

   * **Problem:** Network latency can cause events (drawing actions, chat messages) to arrive at the server or other clients out of the order they were generated.
   * **Solution:** Each client maintains its own vector clock. When an event is generated, the client increments its logical clock component and attaches the entire vector clock (as `vectorTimestamp`) to the event. The server stores this `vectorTimestamp` and includes it when broadcasting the event. Receiving clients merge the incoming `vectorTimestamp` with their local vector clock to understand the causal relationship between events.
   * **Benefit:** Helps maintain the correct sequence of events, especially for series of actions from a single source (e.g., rapid drawing strokes), and is foundational for debugging and potential conflict resolution.

5. **Decoupled Services & Inter-Service Communication (gRPC for Word Service):**

   * **Modularity:** The task of managing word lists and providing word choices is encapsulated in a dedicated gRPC service (WordService).
   * **gRPC:** Chosen for its high performance, use of Protocol Buffers for defining service contracts (IDL), and strong typing, ideal for internal inter-service communication.
   * **Interaction:** The main Node.js backend (gameService.js) acts as a gRPC client, requesting words from the WordService when a new round begins.
   * **Advantages:** The Word Service can be developed, deployed, and scaled independently, potentially in a different programming language.

## System Architecture

The system follows a logical three-tier architecture:

1. **Presentation Tier (Client):** A Next.js frontend responsible for the UI and user interaction.
2. **Application Tier (Backend Server):** A Node.js/Express server handling business logic, API requests, real-time communication orchestration (Socket.IO), and coordination with other services (like the gRPC Word Service). Services within this tier (e.g., `authService`, `roomService`, `gameService`) are designed to be modular.
3. **Data Tier:**

   * **MongoDB:** Used for persistent storage of user profiles, room configurations, and game history.
   * **Redis:** Used for caching and as a message broker for Socket.IO's Pub/Sub mechanism to enable horizontal scaling.

## Technologies Used

* **Frontend:** Next.js
* **Backend:** Node.js, Express.js
* **Real-time Communication:** Socket.IO
* **Database:** MongoDB
* **Caching & Pub/Sub:** Redis
* **Message Queue:** RabbitMQ (using `amqplib` library)
* **Inter-Service Communication:** gRPC with Protocol Buffers
* **Leader Election Algorithm:** Bully Algorithm
* **Event Ordering:** Vector Clocks

## Screenshots

Screenshots of the application, including the frontend (avatar customization, game lobby, drawing interface), RabbitMQ management UI, analytics dashboard, and logs, are available in the project report.

* Frontend examples
* RabbitMQ Overview
* Analytics UI
* Websockets Logs
* GRPC Server Log

## Setup and Running the Project

1. **Prerequisites:**

   * Node.js (version compatible with project dependencies)
   * MongoDB instance running
   * Redis instance running
   * RabbitMQ instance running
   * Proto compiler (for gRPC, if modifications to `.proto` files are needed)

2. **Backend Setup:**

   * Clone the repository.
   * Navigate to the backend directory: `cd backend`
   * Install dependencies: `npm install`
   * Create a `.env` file in the `backend` directory and add the following environment variables:

     ```env
     MONGODB_URI=mongodb://localhost:27017/sketch
     RABBITMQ_URL=amqp://guest:guest@localhost:5672/
     ```
   * Start the backend server: `npm start` (or `npm run dev` if a dev script is configured)

3. **Frontend Setup:**

   * Navigate to the frontend directory: `cd frontend`
   * Install dependencies: `npm install`
   * Create a `.env.local` file (or `.env`) in the `frontend` directory and add the following environment variables:

     ```env
     NEXT_PUBLIC_API_BACKEND_URL=http://localhost:5000/api/v1
     NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
     NEXT_PUBLIC_ANALYTIC_URL=http://localhost:3001/api/analytics
     # Ensure the port in NEXT_PUBLIC_API_BACKEND_URL and NEXT_PUBLIC_SOCKET_URL matches the backend port
     ```
   * Start the frontend development server: `npm run dev`


4. **Analytics Service (Consumer for RabbitMQ):**

   * Navigate to the Analytics service directory.
   * Install dependencies: `npm install`
   * Configure environment variables, including `RABBITMQ_URL` and database connection details for analytics.
   * Start the analytics consumer service. This service will listen to the `scribble_analytics_processor_queue_v1` on RabbitMQ.

**Note:** Ensure all services (MongoDB


, Redis, RabbitMQ) are running before starting the application components. The port numbers and URLs in the environment variables should match your local setup.


