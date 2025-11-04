"""
Find the 5, 10, and 15 minute drive-time polygons around all locations of a grocery store chain in a city.
"""

import os
import arcgis
import pandas as pd
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def print_result(result):
    """Print useful information from the result."""
    pd.set_option("display.max_rows", None)
    pd.set_option("display.max_colwidth", None)

    output_polygons = result.service_areas.sdf
    print(output_polygons)
    print("\n-- Output Polygons -- \n")
    print(output_polygons[["StoreId", "StoreName", "Address",
                           "FromBreak", "ToBreak"]].to_string(index=False))


def main():
    """Program execution logic."""
    # inputs
    facilities = {
        "displayFieldName": "",
        "fieldAliases": {
            "StoreName": "Store Name",
            "Address": "Address",
            "StoreId": "Store ID"
        },
        "geometryType": "esriGeometryPoint",
        "spatialReference": {
            "wkid": 4326,
            "latestWkid": 4326
        },
        "fields": [
            {
                "name": "StoreName",
                "type": "esriFieldTypeString",
                "alias": "Name",
                "length": 50
            },
            {
                "name": "Address",
                "type": "esriFieldTypeString",
                "alias": "Name",
                "length": 256
            },
            {
                "name": "StoreId",
                "type": "esriFieldTypeString",
                "alias": "Store ID",
                "length": 16
            }
        ],
        "features": [
            {
                "attributes": {
                    "StoreName": "Store 1",
                    "Address": "1775 E Lugonia Ave, Redlands, CA 92374",
                    "StoreId": "120"
                },
                "geometry": {
                    "x": -117.14002999994386,
                    "y": 34.071219999994128
                }
            },
            {
                "attributes": {
                    "StoreName": "Store 2",
                    "Address": "1536 Barton Rd, Redlands, CA 92373",
                    "StoreId": "130"
                },
                "geometry": {
                    "x": -117.207329999671,
                    "y": 34.047980000203609
                }
            },
            {
                "attributes": {
                    "StoreName": "Store 3",
                    "Address": "11 E Colton Ave, Redlands, CA 92374",
                    "StoreId": "121"
                },
                "geometry": {
                    "x": -117.18194000041973,
                    "y": 34.06351999976232
                }
            }
        ]
    }


    # Connect to the Service area service
    api_key = os.getenv("ARCGIS_API_KEY")
    arcgis.GIS("https://www.arcgis.com", api_key=api_key)

    # Call the Service Area service
    result = arcgis.network.analysis.generate_service_areas(facilities=facilities,
                                                            break_values="5 10 15",
                                                            travel_direction="Towards Facility")
    print_result(result)



if __name__ == "__main__":
    main()