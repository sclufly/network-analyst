from arcgis.gis import GIS  # type: ignore

gis = GIS()

public_content = gis.content.search("Fire", item_type="Feature Layer", max_items=5)

print(public_content)