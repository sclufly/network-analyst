"""
Find the best location for a new branch of a fast food restaurant to serve additional customers.
"""

import datetime
import arcgis
import pandas as pd
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def print_result(result):
    """Print useful information from the result."""
    pd.set_option("display.max_rows", None)
    pd.set_option("display.max_colwidth", None)

    output_facilities = result.output_facilities.sdf[["Name", "FacilityType", "DemandCount", "DemandWeight"]]
    print("\n-- Chosen Facilities -- \n")
    print(output_facilities[output_facilities["FacilityType"].isin([1, 3])].to_string(index=False))

    output_allocation = result.output_allocation_lines.sdf
    print("\n-- Output Allocation -- \n")
    print(output_allocation[["Name", "Weight", "Total_Minutes"]].to_string(index=False))


def main():
    """Program execution logic."""
    # inputs
    facilities = {
        "features": [
            {
                "attributes": {
                    "Name": "Existing Location",
                    "FacilityType": 1
                },
                "geometry": {
                    "x": -122.333906,
                    "y": 47.609152
                }
            },
            {
                "attributes": {
                    "Name": "Candidate 1",
                    "FacilityType": 0
                },
                "geometry": {
                    "x": -122.333585,
                    "y": 47.604501
                }
            },
            {
                "attributes": {
                    "Name": "Candidate 2",
                    "FacilityType": 0
                },
                "geometry": {
                    "x": -122.334550,
                    "y": 47.605557
                }
            },
            {
                "attributes": {
                    "Name": "Candidate 3",
                    "FacilityType": 0
                },
                "geometry": {
                    "x": -122.337753,
                    "y": 47.609442
                }
            },
            {
                "attributes": {
                    "Name": "Candidate 4",
                    "FacilityType": 0
                },
                "geometry": {
                    "x": -122.335319,
                    "y": 47.607317
                }
            }
        ]
    }
    demand_points = {
        "features": [
            {
                "attributes": {
                    "Name": "Colman Building",
                    "Weight": 1573
                },
                "geometry": {
                    "x": -122.335583,
                    "y": 47.603495
                }
            },
            {
                "attributes": {
                    "Name": "Norton Parking Garage",
                    "Weight": 1262
                },
                "geometry": {
                    "x": -122.33482,
                    "y": 47.603745
                }
            },
            {
                "attributes": {
                    "Name": "DocuSign Tower",
                    "Weight": 2385
                },
                "geometry": {
                    "x": -122.334151,
                    "y": 47.605060
                }
            },
            {
                "attributes": {
                    "Name": "Fourth and Madison Building",
                    "Weight": 1096
                },
                "geometry": {
                    "x": -122.333227,
                    "y": 47.605493
                }
            },
            {
                "attributes": {
                    "Name": "Safeco Plaza",
                    "Weight": 3618
                },
                "geometry": {
                    "x": -122.333899,
                    "y": 47.606190
                }
            },
            {
                "attributes": {
                    "Name": "1201 Third Avenue",
                    "Weight": 1782
                },
                "geometry": {
                    "x": -122.336163,
                    "y": 47.607204
                }
            },
            {
                "attributes": {
                    "Name": "Puget Sound Plaza",
                    "Weight": 2165
                },
                "geometry": {
                    "x": -122.335796,
                    "y": 47.608602
                }
            },
            {
                "attributes": {
                    "Name": "Rainier Square",
                    "Weight": 1316
                },
                "geometry": {
                    "x": -122.334881,
                    "y": 47.609021
                }
            },
            {
                "attributes": {
                    "Name": "Century Square",
                    "Weight": 1974
                },
                "geometry": {
                    "x": -122.337503,
                    "y": 47.610273
                }
            },
            {
                "attributes": {
                    "Name": "Miken Building",
                    "Weight": 3920
                },
                "geometry": {
                    "x": -122.336516,
                    "y": 47.609510
                }
            },
            {
                "attributes": {
                    "Name": "Westlake Park",
                    "Weight": 2467
                },
                "geometry": {
                    "x": -122.336353,
                    "y": 47.6110466
                }
            },
            {
                "attributes": {
                    "Name": "U.S. Bank Centre",
                    "Weight": 3997
                },
                "geometry": {
                    "x": -122.334571,
                    "y": 47.610492
                }
            },
            {
                "attributes": {
                    "Name": "Westlake Center",
                    "Weight": 2440
                },
                "geometry": {
                    "x": -122.337406,
                    "y": 47.611980
                }
            },
            {
                "attributes": {
                    "Name": "Nordstrom Flagship Store",
                    "Weight": 2438
                },
                "geometry": {
                    "x": -122.336295,
                    "y": 47.6123047
                }
            },
            {
                "attributes": {
                    "Name": "Columbia Center",
                    "Weight": 5400
                },
                "geometry": {
                    "x": -122.330746,
                    "y": 47.604502
                }
            },
            {
                "attributes": {
                    "Name": "800 Fifth Avenue",
                    "Weight": 3697
                },
                "geometry": {
                    "x": -122.330228,
                    "y": 47.605698
                }
            },
            {
                "attributes": {
                    "Name": "Seattle Municipal Tower",
                    "Weight": 2025
                },
                "geometry": {
                    "x": -122.329605,
                    "y": 47.605143
                }
            },
            {
                "attributes": {
                    "Name": "Washington State Convention Center",
                    "Weight": 1076
                },
                "geometry": {
                    "x": -122.331520,
                    "y": 47.611664
                }
            }
        ]
    }


    # Connect to the location-allocation service
    api_key = os.getenv("ARCGIS_API_KEY")
    arcgis.GIS("https://www.arcgis.com", api_key=api_key)

    # Get the walking time travel mode defined for the portal. Fail if the travel mode is not found.
    walking_time_travel_mode = ""
    for feature in arcgis.network.analysis.get_travel_modes().supported_travel_modes.features:
        attributes = feature.attributes
        if attributes["AltName"] == "Walking Time":
            walking_time_travel_mode = attributes["TravelMode"]
            break
    assert walking_time_travel_mode, "Walking Time travel mode not found"

    # Call the location-allocation service
    result = arcgis.network.analysis.solve_location_allocation(facilities=facilities,
                                                               demand_points=demand_points,
                                                               travel_mode=walking_time_travel_mode,
                                                               problem_type="Maximize Attendance",
                                                               number_of_facilities_to_find=2,
                                                               travel_direction="Demand to Facility",
                                                               )
    print_result(result)



if __name__ == "__main__":
    main()