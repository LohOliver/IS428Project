import socket
import os

from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, desc, extract, Integer
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

excluded_locations = [
        # Continents and global
        'World', 'Europe', 'North America', 'South America', 'Asia', 
        'Africa', 'Oceania', 
        
        # Regional groups
        'European Union', 'European Union (27)', 'Commonwealth', 'NATO', 'G20',
        
        # Income-based categories
        'High income', 'High-income countries',
        'Upper middle income', 'Upper-middle-income countries',
        'Lower middle income', 'Lower-middle-income countries',
        'Low-income countries',
        'Low income',
        
        # Other
        'International'
    ]

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

class PolicyData(db.Model):
    __tablename__ = 'policy_data'

    unique_id = db.Column(db.String(255), primary_key=True)
    authorizing_level_of_government = db.Column(db.String(255), nullable=True)
    authorizing_country_name = db.Column(db.String(255), nullable=True)
    authorizing_country_iso = db.Column(db.String(10), nullable=True)
    authorizing_state_province = db.Column(db.String(255), nullable=True)
    authorizing_local_area = db.Column(db.String(255), nullable=True)
    authorizing_local_area_code = db.Column(db.String(50), nullable=True)
    authorizing_role = db.Column(db.String(255), nullable=True)
    authorizing_body = db.Column(db.String(255), nullable=True)
    name_of_official = db.Column(db.String(255), nullable=True)
    affected_level_of_government = db.Column(db.String(255), nullable=True)
    affected_country_name = db.Column(db.String(255), nullable=True)
    affected_country_iso = db.Column(db.String(10), nullable=True)
    affected_state_province = db.Column(db.String(255), nullable=True)
    affected_local_area = db.Column(db.String(255), nullable=True)
    affected_local_area_code = db.Column(db.String(50), nullable=True)
    policy_relaxing_or_restricting = db.Column(db.String(255), nullable=True)
    policy_category = db.Column(db.String(255), nullable=True)
    policy_subcategory = db.Column(db.String(255), nullable=True)
    policy_target = db.Column(db.String(255), nullable=True)
    policy_description = db.Column(db.Text, nullable=True)
    issued_date = db.Column(db.Date, nullable=True)
    effective_start_date = db.Column(db.Date, nullable=True)
    anticipated_end_date = db.Column(db.Date, nullable=True)
    actual_end_date = db.Column(db.Date, nullable=True)
    intended_duration = db.Column(db.String(50), nullable=True)
    prior_row_id_linked = db.Column(db.String(255), nullable=True)
    data_source_for_policy_announcement = db.Column(db.String(255), nullable=True)
    policy_law_name = db.Column(db.String(255), nullable=True)
    policy_law_type = db.Column(db.String(255), nullable=True)
    data_source_for_law_policy = db.Column(db.String(255), nullable=True)
    pdf_file_name = db.Column(db.String(255), nullable=True)
    attachment_for_policy = db.Column(db.String(255), nullable=True)
    policy_number = db.Column(db.String(255), nullable=True)
    authorizing_entity_has_authority = db.Column(db.Boolean, nullable=True)
    relevant_authority = db.Column(db.String(255), nullable=True)
    data_source_for_authority = db.Column(db.String(255), nullable=True)
    home_rule_state = db.Column(db.Boolean, nullable=True)
    dillons_rule_state = db.Column(db.Boolean, nullable=True)

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

@app.route('/totals', methods=['GET'])
def get_aggregation_data():
    latest_record = (
        db.session.query(CovidData.total_vaccinations)
        .filter(CovidData.location == 'World', CovidData.total_vaccinations != None, CovidData.total_vaccinations != "")
        .order_by(CovidData.date.desc())
        .first()
    )
    total_vaccinations = latest_record.total_vaccinations
    latest_record = (
        db.session.query(CovidData.total_deaths)
        .filter(CovidData.location == 'World', CovidData.total_deaths != None, CovidData.total_deaths != "")
        .order_by(CovidData.date.desc())
        .first()
    )
    total_deaths = latest_record.total_deaths
    latest_record = (
        db.session.query(CovidData.total_cases)
        .filter(CovidData.location == 'World', CovidData.total_cases != None, CovidData.total_cases != "")
        .order_by(CovidData.date.desc())
        .first()
    )
    total_cases = latest_record.total_cases
    total_estimated_recovered = total_cases - total_deaths
    return jsonify({"total_vaccinations": total_vaccinations, "total_deaths": total_deaths, "total_estimated_recovered": total_estimated_recovered, "total_cases": total_cases})

@app.route('/total_cases_by_country', methods=['GET'])
def get_total_cases_by_country():
    """
    Get the maximum total COVID-19 cases for each country.
    
    Returns:
        JSON response with the structure:
        {
            "country_name": max_total_cases_value,
            ...
        }
    """
    # Query to get the maximum total cases for each country
    max_total_cases_query = db.session.query(
        CovidData.location,
        (func.max(CovidData.total_cases) / func.max(CovidData.population))
    ).group_by(
        CovidData.location
    ).filter(
        CovidData.total_cases.isnot(None)  # Filter out NULL values
    ).all()
    
    # Convert query result to dictionary
    result = {country: max_cases for country, max_cases in max_total_cases_query}
    
    return jsonify(result)

# Add these three new endpoint functions to your Flask application

@app.route('/total_deaths_by_country', methods=['GET'])
def get_total_deaths_by_country():
    """
    Get the maximum total COVID-19 deaths for each country.
    
    Returns:
        JSON response with the structure:
        {
            "country_name": max_total_deaths_value,
            ...
        }
    """
    # Query to get the maximum total deaths for each country
    max_total_deaths_query = db.session.query(
        CovidData.location,
        (func.max(CovidData.total_deaths) / func.max(CovidData.total_cases))
    ).group_by(
        CovidData.location
    ).filter(
        CovidData.total_deaths.isnot(None)  # Filter out NULL values
    ).all()
    
    # Format the result as a dictionary
    result = {location: max_deaths for location, max_deaths in max_total_deaths_query}
    
    return jsonify(result)


@app.route('/total_recovered_by_country', methods=['GET'])
def get_total_recovered_by_country():
    """
    Get the estimated maximum total COVID-19 recovered cases for each country.
    Calculated using the maximum total cases and maximum total deaths for each country.
    
    Returns:
        JSON response with the structure:
        {
            "country_name": max_total_recovered_value,
            ...
        }
    """
    # Query to get the maximum total cases for each country
    max_total_cases_query = db.session.query(
        CovidData.location,
        func.max(CovidData.total_cases).label("max_total_cases")
    ).group_by(
        CovidData.location
    ).filter(
        CovidData.total_cases.isnot(None)
    ).subquery()
    
    # Query to get the maximum total deaths for each country
    max_total_deaths_query = db.session.query(
        CovidData.location,
        func.max(CovidData.total_deaths).label("max_total_deaths")
    ).group_by(
        CovidData.location
    ).filter(
        CovidData.total_deaths.isnot(None)
    ).subquery()
    
    # Join the two queries to calculate recovered cases
    recovered_query = db.session.query(
        max_total_cases_query.c.location,
        max_total_cases_query.c.max_total_cases,
        max_total_deaths_query.c.max_total_deaths
    ).join(
        max_total_deaths_query,
        max_total_cases_query.c.location == max_total_deaths_query.c.location
    ).all()
    
    # Calculate recovered cases as max total cases minus max total deaths
    result = {}
    for location, max_total_cases, max_total_deaths in recovered_query:
        if max_total_cases is not None and max_total_deaths is not None and max_total_cases != 0:
            # Ensure we don't have negative recovered values
            recovered = max(0, int(max_total_cases) - int(max_total_deaths)) / max_total_cases
            result[location] = recovered
        else:
            result[location] = 0
    
    return jsonify(result)


@app.route('/total_vaccinated_by_country', methods=['GET'])
def get_total_vaccinated_by_country():
    # Same query as before
    max_vaccinated_query = db.session.query(
        CovidData.location,
        (func.max(CovidData.people_fully_vaccinated) / func.max(CovidData.population))
    ).group_by(
        CovidData.location
    ).filter(
        CovidData.people_fully_vaccinated.isnot(None)
    ).all()
    
    # Keep as float instead of converting to int
    result = {location: float(max_vaccinated) if max_vaccinated is not None else 0.0 
              for location, max_vaccinated in max_vaccinated_query}
    
    return jsonify(result)


@app.route('/top10_countries_by_cases', methods=['GET'])
def get_top10_countries_by_cases():
    """
    Get the top 10 countries with the highest maximum total COVID-19 cases.
    Uses maximum case count for each country rather than latest date.
    Excludes regions, continents, and other non-country entities.
    
    Returns:
        JSON response with the structure:
        {
            "country_name": max_total_cases_percentage,
            ...
        }
    """    
    
    # Query to get the maximum total cases for each country
    max_cases_query = db.session.query(
        CovidData.location,
        (func.round((func.max(CovidData.total_cases) / func.max(CovidData.population)) * 100, 2)).label("max_total_cases_percent")
    ).filter(
        CovidData.total_cases.isnot(None),  # Filter out NULL values
        ~CovidData.location.in_(excluded_locations)  # Exclude non-countries
    ).group_by(
        CovidData.location
    ).order_by(
        func.max(CovidData.total_cases).desc()  # Order by max total cases in descending order
    ).limit(10)  # Limit to top 10
    
    # Format the result as a dictionary
    result = {location: max_cases_percent for location, max_cases_percent in max_cases_query}
    
    return jsonify(result)



@app.route('/top10_countries_by_deaths', methods=['GET'])
def get_top_10_countries_by_death_rate():
    """
    Get the top 10 countries with the highest COVID-19 death rate (deaths as percentage of cases).
    
    Returns:
        JSON response with the structure:
        {
            "country_name": death_rate_percentage,
            ...
        }
    """
    # Query to get the death rate (deaths per cases) for each country
    death_rate_query = db.session.query(
        CovidData.location,
        func.round((func.max(CovidData.total_deaths) / func.max(CovidData.total_cases)) * 100, 2).label("death_rate_percent")
    ).filter(
        CovidData.total_deaths.isnot(None),
        CovidData.total_cases.isnot(None),  # Ensure both deaths and cases are not NULL
        ~CovidData.location.in_(excluded_locations)
    ).group_by(
        CovidData.location
    ).having(
        func.max(CovidData.total_cases) > 0  # Prevent division by zero using HAVING instead of WHERE
    ).order_by(
        (func.max(CovidData.total_deaths) / func.max(CovidData.total_cases)).desc()  # Sort by death rate in descending order
    ).limit(10)
    
    # Format the result as a dictionary
    result = {location: death_rate for location, death_rate in death_rate_query}
    
    return jsonify(result)



@app.route('/top10_countries_by_recovered', methods=['GET'])
def get_top10_countries_by_recovered():
    """
    Get the top 10 countries with the highest COVID-19 recovery rates.
    
    Returns:
        JSON response with the structure:
        {
            "country_name": recovery_rate_percentage,
            ...
        }
    """
    # Get the recovery data from the existing function
    recovered_data = get_total_recovered_by_country().json
    
    # If the data isn't already in percentage format with 2 decimal places,
    # convert it here (assuming the values need to be multiplied by 100 and rounded)
    formatted_data = {country: round(rate * 100, 2) if isinstance(rate, (int, float)) else rate 
                     for country, rate in recovered_data.items()}
    
    # Get the top 10 countries by recovery rate
    top_10_recovered = dict(sorted(formatted_data.items(), key=lambda x: x[1], reverse=True)[:10])

    return jsonify(top_10_recovered)

@app.route('/top10_countries_by_vaccination', methods=['GET'])
def get_top10_countries_by_vaccination():
    """
    Get the top 10 countries with the highest COVID-19 vaccination rates (percentage of population).
    Uses maximum vaccination count for each country rather than latest date.
    Excludes regions, continents, and other non-country entities.
    
    Returns:
        JSON response with the structure:
        {
            "country_name": vaccination_rate_percentage,
            ...
        }
    """
    
    # Query to get the maximum vaccination rate for each country as a percentage with 2 decimal places
    max_vaccination_query = db.session.query(
        CovidData.location,
        func.least(func.round((func.max(CovidData.people_fully_vaccinated) / func.max(CovidData.population)) * 100, 2), 100).label("vaccination_rate_percent")
    ).filter(
        CovidData.people_fully_vaccinated.isnot(None),
        ~CovidData.location.in_(excluded_locations)  # Exclude non-countries
    ).group_by(
        CovidData.location
    ).order_by(
        (func.max(CovidData.people_fully_vaccinated) / func.max(CovidData.population)).desc()  # Order by vaccination rate
    ).limit(10)  # Limit to top 10
    
    # Format the result as a dictionary
    result = {location: vaccination_rate for location, vaccination_rate in max_vaccination_query}
    
    return jsonify(result)

@app.route('/continents_new_cases_per_month', methods=['GET'])
def get_continents_new_cases_per_month():
    """
    Get the total new cases per month for all continents.
    
    Returns:
        JSON response with the structure:
        {
            "continent_name": {
                "YYYY-MM": new_cases_for_month,
                ...
            },
            ...
        }
    """
    # List of continents to include
    continents = [
        'Africa', 
        'Asia', 
        'Europe', 
        'North America', 
        'Oceania', 
        'South America'
    ]
    
    # Get new cases per month for each continent by summing the new_cases field
    new_cases_per_month_query = db.session.query(
        CovidData.continent,
        func.extract('year', CovidData.date).label("year"),
        func.extract('month', CovidData.date).label("month"),
        func.sum(CovidData.new_cases).label("monthly_new_cases")
    ).filter(
        CovidData.continent.in_(continents),
        CovidData.new_cases.isnot(None)
    ).group_by(
        CovidData.continent,
        func.extract('year', CovidData.date),
        func.extract('month', CovidData.date)
    ).all()
    
    # Format the result as a nested dictionary
    result = {}
    for continent, year, month, monthly_new_cases in new_cases_per_month_query:
        if continent not in result:
            result[continent] = {}
            
        # Format month to ensure it's always two digits
        month_str = f"{int(month):02d}"
        date_key = f"{int(year)}-{month_str}"
        
        # Store the monthly new cases count
        result[continent][date_key] = int(monthly_new_cases) if monthly_new_cases else 0
    
    return jsonify(result)

@app.route('/continents_new_deaths_per_month', methods=['GET'])
def get_continents_new_deaths_per_month():
    """
    Get the total new deaths per month for all continents.
    
    Returns:
        JSON response with the structure:
        {
            "continent_name": {
                "YYYY-MM": new_deaths_for_month,
                ...
            },
            ...
        }
    """
    # List of continents to include
    continents = [
        'Africa', 
        'Asia', 
        'Europe', 
        'North America', 
        'Oceania', 
        'South America'
    ]
    
    # Get new deaths per month for each continent by summing the new_deaths field
    new_deaths_per_month_query = db.session.query(
        CovidData.continent,
        func.extract('year', CovidData.date).label("year"),
        func.extract('month', CovidData.date).label("month"),
        func.sum(CovidData.new_deaths).label("monthly_new_deaths")
    ).filter(
        CovidData.continent.in_(continents),
        CovidData.new_deaths.isnot(None)
    ).group_by(
        CovidData.continent,
        func.extract('year', CovidData.date),
        func.extract('month', CovidData.date)
    ).all()
    
    # Format the result as a nested dictionary
    result = {}
    for continent, year, month, monthly_new_deaths in new_deaths_per_month_query:
        if continent not in result:
            result[continent] = {}
            
        # Format month to ensure it's always two digits
        month_str = f"{int(month):02d}"
        date_key = f"{int(year)}-{month_str}"
        
        # Store the monthly new deaths count
        result[continent][date_key] = int(monthly_new_deaths) if monthly_new_deaths else 0
    
    return jsonify(result)

@app.route('/continents_new_vaccinations_per_month', methods=['GET'])
def get_continents_new_vaccinations_per_month():
    """
    Get the total new vaccinations per month for all continents.
    
    Returns:
        JSON response with the structure:
        {
            "continent_name": {
                "YYYY-MM": new_vaccinations_for_month,
                ...
            },
            ...
        }
    """
    # List of continents to include
    continents = [
        'Africa', 
        'Asia', 
        'Europe', 
        'North America', 
        'Oceania', 
        'South America'
    ]
    
    # Get new vaccinations per month for each continent by summing the new_vaccinations field
    new_vaccinations_per_month_query = db.session.query(
        CovidData.continent,
        func.extract('year', CovidData.date).label("year"),
        func.extract('month', CovidData.date).label("month"),
        func.sum(CovidData.new_vaccinations).label("monthly_new_vaccinations")
    ).filter(
        CovidData.continent.in_(continents),
        CovidData.new_vaccinations.isnot(None)
    ).group_by(
        CovidData.continent,
        func.extract('year', CovidData.date),
        func.extract('month', CovidData.date)
    ).all()
    
    # Format the result as a nested dictionary
    result = {}
    for continent, year, month, monthly_new_vaccinations in new_vaccinations_per_month_query:
        if continent not in result:
            result[continent] = {}
            
        # Format month to ensure it's always two digits
        month_str = f"{int(month):02d}"
        date_key = f"{int(year)}-{month_str}"
        
        # Store the monthly new vaccinations count
        result[continent][date_key] = int(monthly_new_vaccinations) if monthly_new_vaccinations else 0
    
    return jsonify(result)

@app.route('/continents_estimated_recoveries_per_month', methods=['GET'])
def get_continents_estimated_recoveries_per_month():
    """
    Get the estimated recoveries per month for all continents.
    Since there is no direct field for recovered, we estimate it as (new cases from previous month - new deaths).
    
    Returns:
        JSON response with the structure:
        {
            "continent_name": {
                "YYYY-MM": estimated_recoveries_for_month,
                ...
            },
            ...
        }
    """
    # List of continents to include
    continents = [
        'Africa', 
        'Asia', 
        'Europe', 
        'North America', 
        'Oceania', 
        'South America'
    ]
    
    # First, get new cases and new deaths per month for each continent
    cases_deaths_query = db.session.query(
        CovidData.continent,
        func.extract('year', CovidData.date).label("year"),
        func.extract('month', CovidData.date).label("month"),
        func.sum(CovidData.new_cases).label("monthly_new_cases"),
        func.sum(CovidData.new_deaths).label("monthly_new_deaths")
    ).filter(
        CovidData.continent.in_(continents),
        CovidData.new_cases.isnot(None),
        CovidData.new_deaths.isnot(None)
    ).group_by(
        CovidData.continent,
        func.extract('year', CovidData.date),
        func.extract('month', CovidData.date)
    ).all()
    
    # Store cases and deaths in temporary dictionaries for processing
    cases_by_continent = {}
    deaths_by_continent = {}
    
    for continent, year, month, new_cases, new_deaths in cases_deaths_query:
        year_int = int(year)
        month_int = int(month)
        
        if continent not in cases_by_continent:
            cases_by_continent[continent] = {}
            deaths_by_continent[continent] = {}
        
        month_key = (year_int, month_int)
        cases_by_continent[continent][month_key] = int(new_cases) if new_cases else 0
        deaths_by_continent[continent][month_key] = int(new_deaths) if new_deaths else 0
    
    # Now calculate estimated recoveries and format the result
    result = {}
    
    for continent in continents:
        if continent not in cases_by_continent:
            continue
            
        result[continent] = {}
        
        # Sort month keys for processing in chronological order
        sorted_months = sorted(cases_by_continent[continent].keys())
        
        for i, current_month in enumerate(sorted_months):
            year, month = current_month
            date_key = f"{year}-{month:02d}"
            
            # For the first month, we can't calculate recoveries (no previous month's data)
            if i == 0:
                # Use a simple estimate: 80% of cases minus deaths
                current_cases = cases_by_continent[continent][current_month]
                current_deaths = deaths_by_continent[continent][current_month]
                estimated_recoveries = max(0, int(current_cases * 0.8) - current_deaths)
            else:
                # For subsequent months, use previous month's cases minus current month's deaths
                prev_month = sorted_months[i-1]
                prev_cases = cases_by_continent[continent][prev_month]
                current_deaths = deaths_by_continent[continent][current_month]
                # Assume 90% of previous month's cases recover this month, minus deaths
                estimated_recoveries = max(0, int(prev_cases * 0.9) - current_deaths)
            
            result[continent][date_key] = estimated_recoveries
    
    return jsonify(result)
    
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

@app.route('/recovered_globally', methods=['GET'])
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

# You can also add an endpoint to get data for a specific country
@app.route('/avg_stringency_by_month', methods=['GET'])
def get_avg_stringency_by_month():
    """
    Get the average stringency index for each country, grouped by month,
    filtered to only include data up to 2023-01.
    
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
    # Extract year and month from date for grouping (original query without date filtering)
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
        
        # Only include dates up to and including 2023-01
        if date_key < "2023-01":
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

@app.route('/max_cases_per_month/<country>', methods=['GET'])
def get_max_cases_per_month(country):

    # Query the CovidData table to sum new cases by month for the selected country
    monthly_cases_query = db.session.query(
        extract('year', CovidData.date).label('year'),
        extract('month', CovidData.date).label('month'),
        func.sum(CovidData.new_cases).label('total_new_cases_per_month')
    ).filter(
        CovidData.location == country,
        CovidData.new_cases.isnot(None)  # Filter out NULL values
    ).group_by(
        extract('year', CovidData.date),
        extract('month', CovidData.date)
    ).all()

    # Process the data to organize monthly case totals
    monthly_cases = {}

    for year, month, total_new_cases in monthly_cases_query:
        if year not in monthly_cases:
            monthly_cases[year] = {}
        # Convert to int for cleaner JSON output
        monthly_cases[year][month] = int(total_new_cases) if total_new_cases else 0

    return jsonify(monthly_cases)

@app.route('/max_deaths_per_month/<country>', methods=['GET'])
def get_max_deaths_per_month(country):
    # Query the CovidData table to sum new deaths by month for the selected country
    monthly_deaths_query = db.session.query(
        extract('year', CovidData.date).label('year'),
        extract('month', CovidData.date).label('month'),
        func.sum(CovidData.new_deaths).label('total_new_deaths_per_month')
    ).filter(
        CovidData.location == country,
        CovidData.new_deaths.isnot(None)  # Filter out NULL values
    ).group_by(
        extract('year', CovidData.date),
        extract('month', CovidData.date)
    ).all()

    # Process the data to organize monthly death totals
    monthly_deaths = {}

    for year, month, total_new_deaths in monthly_deaths_query:
        if year not in monthly_deaths:
            monthly_deaths[year] = {}
        # Convert to int for cleaner JSON output
        monthly_deaths[year][month] = int(total_new_deaths) if total_new_deaths else 0

    return jsonify(monthly_deaths)

@app.route('/max_recovered_per_month/<country>', methods=['GET'])
def get_max_recovered_per_month(country):
    # For recovered cases, we'll estimate as (new cases - new deaths)
    # This is a simplification but provides a reasonable estimate
    monthly_recovered_query = db.session.query(
        extract('year', CovidData.date).label('year'),
        extract('month', CovidData.date).label('month'),
        func.sum(CovidData.new_cases - CovidData.new_deaths).label('total_new_recovered_per_month')
    ).filter(
        CovidData.location == country,
        CovidData.new_cases.isnot(None),
        CovidData.new_deaths.isnot(None)
    ).group_by(
        extract('year', CovidData.date),
        extract('month', CovidData.date)
    ).all()

    # Process the data to organize monthly recovered totals
    monthly_recovered = {}

    for year, month, total_new_recovered in monthly_recovered_query:
        if year not in monthly_recovered:
            monthly_recovered[year] = {}
        # Ensure we don't have negative values and convert to int
        monthly_recovered[year][month] = max(0, int(total_new_recovered)) if total_new_recovered else 0

    return jsonify(monthly_recovered)

@app.route('/max_vaccinations_per_month/<country>', methods=['GET'])
def get_max_vaccinations_per_month(country):
    # Query the CovidData table to sum new vaccinations by month for the selected country
    monthly_vaccinations_query = db.session.query(
        extract('year', CovidData.date).label('year'),
        extract('month', CovidData.date).label('month'),
        func.sum(CovidData.new_vaccinations).label('total_new_vaccinations_per_month')
    ).filter(
        CovidData.location == country,
        CovidData.new_vaccinations.isnot(None)  # Filter out NULL values
    ).group_by(
        extract('year', CovidData.date),
        extract('month', CovidData.date)
    ).all()

    # Process the data to organize monthly vaccination totals
    monthly_vaccinations = {}

    for year, month, total_new_vaccinations in monthly_vaccinations_query:
        if year not in monthly_vaccinations:
            monthly_vaccinations[year] = {}
        # Convert to int for cleaner JSON output
        monthly_vaccinations[year][month] = int(total_new_vaccinations) if total_new_vaccinations else 0

    return jsonify(monthly_vaccinations)

#========================= Covid dashboard 3 ===============================
@app.route('/continent_vs_population', methods=['GET'])
def get_avg_population_by_continent():
    avg_population = (
        db.session.query(
            CovidData.continent, 
            func.round(func.avg(CovidData.population)).cast(Integer)
        )
        .group_by(CovidData.continent).filter(CovidData.population != "")
        .all()
    )

    result = {continent: int(avg) for continent, avg in avg_population}
    return jsonify(result)


@app.route('/avg_hospital_beds_by_continent', methods=['GET'])
def get_avg_hospital_beds_by_continent():
    avg_beds = db.session.query(
        CovidData.continent,
        CovidData.location,
        func.round(func.avg(CovidData.hospital_beds_per_thousand), 3)
    ).group_by(CovidData.continent, CovidData.location).filter(CovidData.hospital_beds_per_thousand != "").all()

    # result = {continent: avg for continent, avg in avg_beds}
    result = {}
    for continent, location, avg in avg_beds:
        if continent not in result:
            result[continent] = {}  # Create nested dictionary for continent
        result[continent][location] = avg  # Add location and average
        
    return jsonify(result)

@app.route('/hospital_beds_vs_death_rate', methods=['GET'])
def get_hospital_beds_vs_death_rate():
    avg_deaths_and_beds = db.session.query(
        CovidData.continent,
        CovidData.location,
        func.round(func.avg(CovidData.total_deaths_per_million)).cast(Integer),
        func.round(func.avg(CovidData.hospital_beds_per_thousand), 3)
    ).group_by(CovidData.continent, CovidData.location).filter(
        CovidData.total_deaths_per_million != "",
        CovidData.hospital_beds_per_thousand != "",
        CovidData.location != "World"
    ).all()

    result = [{"continent" : continent, "country": location, "avg_deaths" : int(avg_deaths), "avg_beds": avg_beds} for continent, location, avg_deaths, avg_beds in avg_deaths_and_beds]
    return jsonify(result)

@app.route('/handwashing_facilities_vs_cases', methods=['GET'])
def get_handwashing_facilities_vs_cases():
    avg_handwashing_and_cases = db.session.query(
        CovidData.continent,
        CovidData.location,
        func.round(func.avg(CovidData.handwashing_facilities), 2),
        func.round(func.avg(CovidData.total_cases_per_million)).cast(Integer)
    ).group_by(CovidData.continent, CovidData.location).filter(
        CovidData.handwashing_facilities != "",
        CovidData.total_cases_per_million != "",
        CovidData.location != "World"
    ).all()

    result = [{"continent": continent, 
               "country": location,
               "avg_handwashing_facilities": avg_handwashing_facilities, 
               "avg_total_cases_per_million": int(avg_total_cases_per_million)} 
              for continent, location, avg_handwashing_facilities, avg_total_cases_per_million in avg_handwashing_and_cases]

    return jsonify(result)

#========================= Covid dashboard 4 ===============================

@app.route('/policies', methods=['GET'])
def get_policies_data():
    data = PolicyData.query.limit(10).all()
    return jsonify([entry.to_dict() for entry in data])

@app.route('/policies/<country_name>', methods=['GET'])
def get_policies_for_country(country_name):
    """
    Get selected fields of policies for a specific country as an authorizing country.
    
    Args:
        country_name: The full name of the country (e.g., 'United States', 'United Kingdom')
        
    Returns:
        JSON list of selected policy fields for the specified country
    """
    # Query policies for the given country name as authorizing country only
    policies = PolicyData.query.filter(
        PolicyData.authorizing_country_iso == country_name
    ).with_entities(
        PolicyData.policy_category,
        PolicyData.policy_subcategory,
        PolicyData.authorizing_country_iso,
        PolicyData.authorizing_country_name,
        PolicyData.actual_end_date,
        PolicyData.effective_start_date,
        PolicyData.policy_description,
        PolicyData.policy_law_name
    ).all()
    
    # Convert query results to dictionaries
    result = [{
        'policy_category': policy.policy_category,
        'policy_subcategory': policy.policy_subcategory,
        'authorizing_country_iso': policy.authorizing_country_iso,
        'authorizing_country_name': policy.authorizing_country_name,
        'actual_end_date':policy.actual_end_date,
        'effective_start_date':policy.effective_start_date,
        'policy_description':policy.policy_description,
        'policy_law_name':policy.policy_law_name
    } for policy in policies]
    
    # Return the results
    return jsonify(result)

@app.route('/all_policies', methods=['GET'])
def get_all_policies():
    policies_query = db.session.query(
        PolicyData.authorizing_country_name,
        PolicyData.policy_law_name,
        PolicyData.effective_start_date
    ).all()
    result = [{"country": country, "policy_name": policy_name, "start_date": start_date} for country, policy_name, start_date in policies_query]
    
    return jsonify(result)

@app.route('/deaths_by_month_and_country', methods=['GET'])
def get_deaths_by_month_and_country():
    deaths_query = db.session.query(
        CovidData.location,  # Group by country
        func.date_format(CovidData.date, "%Y-%m").label("year_month"),  # Extract year and month
        func.max(CovidData.total_deaths)
    ).filter(
        ~CovidData.location.in_(excluded_locations)
    ).group_by(
        CovidData.location, "year_month"
    ).order_by(CovidData.location, "year_month").all()

    # Format the results to group by country and year-month
    result = {}
    for location, year_month, total_deaths in deaths_query:
        if location not in result:
            result[location] = {}
        result[location][year_month] = int(total_deaths) if total_deaths else 0

    return jsonify(result)

@app.route('/cases_by_month_and_country', methods=['GET'])
def get_cases_by_month_and_country():
    cases_query = db.session.query(
        CovidData.location,  # Group by country
        func.date_format(CovidData.date, "%Y-%m").label("year_month"),  # Extract year and month
        func.max(CovidData.total_cases)
    ).filter(
        ~CovidData.location.in_(excluded_locations)
    ).group_by(
        CovidData.location, "year_month"
    ).order_by(CovidData.location, "year_month").all()

    # Format the results to group by country and year-month
    result = {}
    for location, year_month, total_cases in cases_query:
        if location not in result:
            result[location] = {}
        result[location][year_month] = total_cases

    return jsonify(result)


@app.route('/vaccinations_by_month_and_country', methods=['GET'])
def get_vaccinations_by_month_and_country():
    vaccinations_query = db.session.query(
        CovidData.location,  # Group by country
        func.date_format(CovidData.date, "%Y-%m").label("year_month"),  # Extract year and month
        func.max(CovidData.total_vaccinations)
    ).filter(
        ~CovidData.location.in_(excluded_locations)
    ).group_by(
        CovidData.location, "year_month"
    ).order_by(CovidData.location, "year_month").all()

    # Format the results to group by country and year-month
    result = {}
    for location, year_month, total_vaccinations in vaccinations_query:
        if location not in result:
            result[location] = {}
        result[location][year_month] = total_vaccinations if total_vaccinations else 0

    return jsonify(result)

@app.route('/recovered_by_month_and_country', methods=['GET'])
def get_recovered_by_month_and_country():
    query = db.session.query(
        CovidData.location,
        func.date_format(CovidData.date, "%Y-%m").label("year_month"),  # Format date as Year-Month
        func.max(CovidData.total_cases).label("total_cases"),
        func.max(CovidData.total_deaths).label("total_deaths")
    ).filter(
        ~CovidData.location.in_(excluded_locations)  # Exclude non-country locations
    ).group_by(
        CovidData.location,
        func.date_format(CovidData.date, "%Y-%m")  # Group by location and year-month
    ).all()

    # Initialize a dictionary to hold the result
    result = {}

    # Iterate over the query result to calculate recovered cases and structure the data
    for location, year_month, total_cases, total_deaths in query:
        # Calculate recovered cases (total_cases - total_deaths)
        recovered_cases = max(0, total_cases - total_deaths)  # Ensure non-negative recovered cases

        if location not in result:
            result[location] = {}

        result[location][year_month] = recovered_cases

    return jsonify(result)

@app.route('/policy_category_distribution', methods=['GET'])
def get_policy_category_distribution():
    country_filter = request.args.get('country')  # Optional country filter

    query = db.session.query(
        PolicyData.policy_category,
        func.count().label("count")
    )

    if country_filter:
        query = query.filter(PolicyData.authorizing_country_iso == country_filter)

    query = query.group_by(PolicyData.policy_category).order_by(desc("count")).all()

    result = [{"category": category, "count": count} for category, count in query]
    return jsonify(result)

@app.route('/policy_category_count/<country_name>', methods=['GET'])
def get_policy_category_count(country_name):
    """
    Get the count of policies in each category for a specific country.
    
    Args:
        country_name: The ISO code or full name of the country 
        
    Returns:
        JSON object with policy category counts for the specified country
    """
    # Query to count policies by category for the given country
    category_counts = db.session.query(
        PolicyData.policy_category, 
        func.count().label('policy_count')
    ).filter(
        PolicyData.authorizing_country_iso == country_name
    ).group_by(PolicyData.policy_category).order_by(func.count().desc()).all()
    
    # Convert query results to a dictionary
    result = [{
        'policy_category': category,
        'policy_count': count
    } for category, count in category_counts]
    
    # Return the results
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
