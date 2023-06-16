const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen("3003", () => {
      console.log("Server Running at http://localhost:3003/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//1 Returns a list of all states in the state table

app.get("/states/", async (request, response) => {
  const getStates = `SELECT 
    * 
    FROM 
    state;`;
  const statesArray = await db.all(getStates);
  response.send(
    statesArray.map((state) => convertDbObjectToResponseObject(state))
  );
});

//2 Returns a state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  try {
    const { stateId } = request.params;
    const getStateQuery = `SELECT 
    * 
    FROM 
    state
    WHERE state_id = ${stateId};`;
    const stateDetails = await db.get(getStateQuery);
    response.send(convertDbObjectToResponseObject(stateDetails));
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});

//3 Create a district in the district table, district_id is auto-incremented

app.post("/districts/", async (request, response) => {
  try {
    const districtDetails = request.body;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;
    const addNewDistrict = `INSERT INTO 
    district (district_name, state_id, cases, cured, active, deaths)
    VALUES (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths});`;
    const dbResponse = await db.run(addNewDistrict);
    const newDistrictDetails = dbResponse.lastID;
    response.send("District Successfully Added");
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});

//4 Returns a district based on the district ID

app.get("/districts/:districtId/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const districtDetails = `SELECT * FROM district 
    WHERE district_id = ${districtId}`;
    const dbResponse = await db.all(districtDetails);
    response.send(convertDbObjectToResponseObject(dbResponse));
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});

//5 Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const removeDistrictDetails = `SELECT * FROM district 
    WHERE district_id = ${districtId};`;
    await db.run(removeDistrictDetails);
    response.send("District Removed");
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});

//6 Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const districtDetails = request.body;

    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;
    const updatedQuery = `UPDATE district SET 
        district_name = '${districtName}',
        state_id = '${stateId}',
        cases = '${cases}',
        cured = '${cured}',
        active = '${active}',
        deaths = '${deaths}';
        WHERE district_id = ${districtId}`;
    await db.run(updatedQuery);
    response.send("District Details Updated");
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});

//7 Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  try {
    const { stateId } = request.params;
    const stateQuery = `SELECT 
        SUM(cases),
        SUM(cured),
        SUM(active),
        SUM(deaths)
        FROM district
        WHERE state_id = ${stateId}`;
    const stats = await db.get(stateQuery);
    response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cured)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"],
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});

//8 Returns an object containing the state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  try {
    const { districtId } = request.params;
    const stateDetails = `SELECT state_name FROM state 
        NATURAL JOIN district 
        WHERE district_id = ${districtId}`;
    const stateName = await db.get(stateDetails);
    response.send(convertDbObjectToResponseObject(stateName));
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});
module.exports = app;
