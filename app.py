import socket
import os

from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, desc, extract
from flask_cors import CORS

app = Flask(__name__)

DB_CONFIG = {
    "host": "35.240.188.224	",
    "user": "root",
    "password": "visualisation",
    "database": "my_database"
}

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:visualisation@35.240.188.224:3306/my_database'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 100,
    'pool_recycle': 280
}

db = SQLAlchemy(app)

CORS(app)


class CovidData(db.Model):
    __tablename__ = 'covid_data'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    iso_code = db.Column(db.String(10))
    continent = db.Column(db.String(50))
    location = db.Column(db.String(100))
    date = db.Column(db.Date)
    total_cases = db.Column(db.BigInteger)
    new_cases = db.Column(db.BigInteger)
    new_cases_smoothed = db.Column(db.Float)
    total_deaths = db.Column(db.BigInteger)
    new_deaths = db.Column(db.BigInteger)
    new_deaths_smoothed = db.Column(db.Float)
    total_cases_per_million = db.Column(db.Float)
    new_cases_per_million = db.Column(db.Float)
    new_cases_smoothed_per_million = db.Column(db.Float)
    total_deaths_per_million = db.Column(db.Float)
    new_deaths_per_million = db.Column(db.Float)
    new_deaths_smoothed_per_million = db.Column(db.Float)
    reproduction_rate = db.Column(db.Float)
    icu_patients = db.Column(db.BigInteger)
    icu_patients_per_million = db.Column(db.Float)
    hosp_patients = db.Column(db.BigInteger)
    hosp_patients_per_million = db.Column(db.Float)
    weekly_icu_admissions = db.Column(db.BigInteger)
    weekly_icu_admissions_per_million = db.Column(db.Float)
    weekly_hosp_admissions = db.Column(db.BigInteger)
    weekly_hosp_admissions_per_million = db.Column(db.Float)
    total_tests = db.Column(db.BigInteger)
    new_tests = db.Column(db.BigInteger)
    total_tests_per_thousand = db.Column(db.Float)
    new_tests_per_thousand = db.Column(db.Float)
    new_tests_smoothed = db.Column(db.Float)
    new_tests_smoothed_per_thousand = db.Column(db.Float)
    positive_rate = db.Column(db.Float)
    tests_per_case = db.Column(db.Float)
    tests_units = db.Column(db.String(50))
    total_vaccinations = db.Column(db.BigInteger)
    people_vaccinated = db.Column(db.BigInteger)
    people_fully_vaccinated = db.Column(db.BigInteger)
    total_boosters = db.Column(db.BigInteger)
    new_vaccinations = db.Column(db.BigInteger)
    new_vaccinations_smoothed = db.Column(db.Float)
    total_vaccinations_per_hundred = db.Column(db.Float)
    people_vaccinated_per_hundred = db.Column(db.Float)
    people_fully_vaccinated_per_hundred = db.Column(db.Float)
    total_boosters_per_hundred = db.Column(db.Float)
    new_vaccinations_smoothed_per_million = db.Column(db.Float)
    new_people_vaccinated_smoothed = db.Column(db.Float)
    new_people_vaccinated_smoothed_per_hundred = db.Column(db.Float)
    stringency_index = db.Column(db.Float)
    population_density = db.Column(db.Float)
    median_age = db.Column(db.Float)
    aged_65_older = db.Column(db.Float)
    aged_70_older = db.Column(db.Float)
    gdp_per_capita = db.Column(db.Float)
    extreme_poverty = db.Column(db.Float)
    cardiovasc_death_rate = db.Column(db.Float)
    diabetes_prevalence = db.Column(db.Float)
    female_smokers = db.Column(db.Float)
    male_smokers = db.Column(db.Float)
    handwashing_facilities = db.Column(db.Float)
    hospital_beds_per_thousand = db.Column(db.Float)
    life_expectancy = db.Column(db.Float)
    human_development_index = db.Column(db.Float)
    population = db.Column(db.BigInteger)
    excess_mortality_cumulative_absolute = db.Column(db.Float)
    excess_mortality_cumulative = db.Column(db.Float)
    excess_mortality = db.Column(db.Float)
    excess_mortality_cumulative_per_million = db.Column(db.Float)

    def to_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}

class MeasuresData(db.Model):
    __tablename__ = 'measures_data'

    id = db.Column(db.Integer, primary_key=True)
    iso = db.Column(db.String(10), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    region = db.Column(db.String(100), nullable=False)
    admin_level_name = db.Column(db.String(100), nullable=True)
    pcode = db.Column(db.String(50), nullable=True)
    log_type = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    measure_type = db.Column(db.String(100), nullable=False)
    targeted_pop_group = db.Column(db.String(100), nullable=True)  # "checked" if YES, blank for NO
    comments = db.Column(db.Text, nullable=True)
    non_compliance = db.Column(db.String(100), nullable=False)
    date_implemented = db.Column(db.Date)
    source = db.Column(db.String(255), nullable=False)
    source_type = db.Column(db.String(100), nullable=False)
    link = db.Column(db.String(500), nullable=False)
    entry_date = db.Column(db.Date)
    alternative_source = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}


@app.route("/health")
def health_check():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    return jsonify(
            {
                "message": "Service is healthy.",
                "service:": "covid",
                "ip_address": local_ip
            }
    ), 200

#========================= Covid dashboard 1 ===============================
@app.route('/covid', methods=['GET'])
def get_covid_data():
    data = CovidData.query.limit(10).all()
    return jsonify([entry.to_dict() for entry in data])

@app.route('/covid/<int:id>', methods=['GET'])
def get_covid_data_by_id(id):
    data = CovidData.query.get(id)  # Use .get() to fetch the entry by primary key
    if data is None:
        return jsonify({"error": "Data not found"}), 404  # Return 404 if not found
    return jsonify(data.to_dict())  # Return the data as a dictionary

@app.route('/d1_0', methods=['GET'])
def get_aggregation_data():
    total_vaccinations = db.session.query(func.sum(CovidData.total_vaccinations)).scalar()
    total_deaths = db.session.query(func.sum(CovidData.total_deaths)).scalar()
    total_estimated_recovered = db.session.query(func.sum(CovidData.total_cases_per_million)).scalar() - db.session.query(func.sum(CovidData.total_deaths_per_million)).scalar()
    total_cases = db.session.query(func.sum(CovidData.total_cases)).scalar()
    return jsonify({"total_vaccinations": total_vaccinations, "total_deaths": total_deaths, "total_estimated_recovered": total_estimated_recovered, "total_cases": total_cases})

@app.route('/d1_1', methods=['GET'])
def get_vaccination_rate_latest():
    latest_subquery = (
        db.session.query(
            CovidData.location,
            func.max(CovidData.date).label("latest_date")
        )
        .filter(CovidData.people_fully_vaccinated > 0, CovidData.population > 0)
        .group_by(CovidData.location)
        .subquery()
    )

    vaccination_rate_query = (
        db.session.query(
            CovidData.location,
            (CovidData.people_fully_vaccinated / CovidData.population).label("vaccination_rate")
        )
        .join(latest_subquery, (CovidData.location == latest_subquery.c.location) & 
                               (CovidData.date == latest_subquery.c.latest_date))
        .all()
    )

    result = {loc: rate * 100 for loc, rate in vaccination_rate_query}

    return jsonify(result)

@app.route('/d1_2', methods=['GET'])
def get_top10_avg_cases_per_million():
    cases_per_million_per_country = db.session.query(
        CovidData.location,
        (func.sum(CovidData.total_cases_per_million) / func.count()).label("avg_cases_per_million")
    ).group_by(CovidData.location).order_by(desc("avg_cases_per_million")).limit(10).all()

    result = {location: cases for location, cases in cases_per_million_per_country}

    return jsonify(result)

@app.route('/d1_3', methods=['GET'])
def get_estimated_recovered_by_region():
    regions = [
        "European Union (27)", "Europe", "Oceania", "North America",
        "South America", "South Africa", "Asia", "Africa", "Central African Republic"
    ]
    
    recovered_data = (
        db.session.query(
            CovidData.location,
            func.sum(CovidData.total_cases_per_million - CovidData.total_deaths_per_million).label("total_estimated_recovered")
        )
        .filter(CovidData.location.in_(regions))
        .group_by(CovidData.location)
        .all()
    )

    total_recovered = (
        db.session.query(
            func.sum(CovidData.total_cases_per_million - CovidData.total_deaths_per_million)
        )
        .filter(CovidData.location.in_(regions))
        .scalar()
    )

    result = {location: recovered / total_recovered * 100 for location, recovered in recovered_data}

    return jsonify(result)

#========================= Covid dashboard 2 ===============================
@app.route('/d2_0', methods=['GET'])
def get_icu_percentage_by_continent():
    total_icu_query = (
        db.session.query(
             extract('year', CovidData.date).label("year"),
            func.sum(CovidData.icu_patients).label("total_icu_per_year")
        )
        .group_by("year")
        .subquery()
    )

    continent_icu_query = (
        db.session.query(
            extract('year', CovidData.date).label("year"),
            CovidData.continent,
            func.sum(CovidData.icu_patients).label("icu_per_continent")
        )
        .group_by("year", CovidData.continent)
        .subquery()
    )

    percentage_query = (
        db.session.query(
            continent_icu_query.c.year,
            continent_icu_query.c.continent,
            continent_icu_query.c.icu_per_continent,
            (continent_icu_query.c.icu_per_continent / total_icu_query.c.total_icu_per_year * 100).label("percentage")
        )
        .join(total_icu_query, continent_icu_query.c.year == total_icu_query.c.year)
        .order_by(continent_icu_query.c.year, continent_icu_query.c.continent)
        .all()
    )

    result = {}

    for year, continent, icu_patients, percentage in percentage_query:
        if year not in result:
            result[year] = []
        result[year].append({
            "continent": continent,
            "icu_patients": icu_patients,
            "percentage": percentage
        })
        
    return jsonify(result)

#========================= Measures ===============================
@app.route('/measures', methods=['GET'])
def get_measures_data():
    data = MeasuresData.query.limit(10).all()
    return jsonify([entry.to_dict() for entry in data])

@app.route('/full_measures_data', methods=['GET'])
def get_full_measures_data():
    data = MeasuresData.query.with_entities(MeasuresData.country, MeasuresData.region, MeasuresData.category, MeasuresData.date_implemented)
    return jsonify([{"country": entry.country, "region": entry.region, "category": entry.category, "date_implemented": entry.date_implemented} for entry in data])

@app.route('/avg_stringency_by_month', methods=['GET'])
def get_avg_stringency_by_month():
    """
    Get the average stringency index for each country, grouped by month.
    
    Returns:
        JSON response with the structure:
        {
            "country_name": {
                "YYYY-MM": average_stringency_value,
                ...
            },
            ...
        }
    """
    # Extract year and month from date for grouping
    stringency_data = db.session.query(
        CovidData.location,
        func.extract('year', CovidData.date).label('year'),
        func.extract('month', CovidData.date).label('month'),
        func.avg(CovidData.stringency_index).label('avg_stringency')
    ).filter(
        CovidData.stringency_index.isnot(None)  # Filter out NULL values
    ).group_by(
        CovidData.location,
        func.extract('year', CovidData.date),
        func.extract('month', CovidData.date)
    ).all()
    
    # Format the result as a nested dictionary
    result = {}
    for location, year, month, avg_stringency in stringency_data:
        if location not in result:
            result[location] = {}
            
        month_str = f"{int(month):02d}"
        date_key = f"{int(year)}-{month_str}"
        
        result[location][date_key] = float(avg_stringency)
    
    return jsonify(result)

# You can also add an endpoint to get data for a specific country
@app.route('/avg_stringency_by_month/<country>', methods=['GET'])
def get_avg_stringency_by_month_for_country(country):
    """
    Get the average stringency index for a specific country, grouped by month.
    
    Args:
        country: The name of the country to get data for
        
    Returns:
        JSON response with the structure:
        {
            "YYYY-MM": average_stringency_value,
            ...
        }
    """
    stringency_data = db.session.query(
        func.extract('year', CovidData.date).label('year'),
        func.extract('month', CovidData.date).label('month'),
        func.avg(CovidData.stringency_index).label('avg_stringency')
    ).filter(
        CovidData.location == country,
        CovidData.stringency_index.isnot(None)  # Filter out NULL values
    ).group_by(
        func.extract('year', CovidData.date),
        func.extract('month', CovidData.date)
    ).all()
    
    # Format the result as a dictionary
    result = {}
    for year, month, avg_stringency in stringency_data:
        # Format month to ensure it's always two digits
        month_str = f"{int(month):02d}"
        date_key = f"{int(year)}-{month_str}"
        
        result[date_key] = float(avg_stringency)
    
    if not result:
        return jsonify({"error": f"No stringency data found for {country}"}), 404
        
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
