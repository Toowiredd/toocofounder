# COMMANDS.md

## Setting Up the Environment

1. **Install Node.js**: Ensure you have Node.js installed on your machine. You can download it from [Node.js official website](https://nodejs.org/).

2. **Clone the Repository**: Open your terminal and run the following command to clone the repository:
   ```sh
   git clone https://github.com/Toowiredd/toocofounder.git
   ```

3. **Navigate to the Project Directory**: Change your directory to the project folder:
   ```sh
   cd toocofounder
   ```

4. **Install Dependencies**: Run the following command to install all necessary dependencies:
   ```sh
   npm install
   ```

## Running the Server

1. **Start the Server**: Use the following command to start the server:
   ```sh
   npm run start
   ```

2. **Access the Dashboard**: Open your web browser and go to `http://localhost:4200` to access the dashboard.

## Using the Dashboard

1. **Create a New Project**: Click on the "New Project" button and fill in the required details to create a new project.

2. **Manage Projects**: Use the dashboard to manage your existing projects, view their status, and make necessary changes.

## Generating New Projects

1. **Run the Command**: Use the following command to generate a new project:
   ```sh
   npx @openinterface/cofounder -p "YourAppProjectName" -d "describe your app here" -a "(optional) design instructions"
   ```

2. **Follow the Prompts**: Follow the on-screen prompts to complete the project generation process.

## Running Generated Apps

1. **Navigate to the App Directory**: Change your directory to the generated app folder:
   ```sh
   cd apps/YourApp
   ```

2. **Install Dependencies**: Run the following command to install all necessary dependencies:
   ```sh
   npm install
   ```

3. **Start the App**: Use the following command to start the app:
   ```sh
   npm run dev
   ```

4. **Access the App**: Open your web browser and go to `http://localhost:5173` to access the app.
