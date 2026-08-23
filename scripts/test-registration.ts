import { registerUserAction, loginUserAction } from "../src/app/actions/auth";

async function run() {
  const email = `testuser_${Date.now()}@example.com`;
  console.log("Registering:", email);
  const regResult = await registerUserAction({
    name: "New Test Patient",
    email,
    password: "Password123!",
    role: "PATIENT",
    phone: "+1-555-0199",
  });
  console.log("Registration:", regResult);
}

run().catch(console.error);
