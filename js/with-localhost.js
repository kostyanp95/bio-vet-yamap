var inputAdress = document.getElementById('address'),
    inputCoordinates = document.getElementById('coordinates'),
    inputLink = document.getElementById('link'),
    createBtn = document.getElementsByName('btn-primary')[0],
    organizations = [],
    createOrganizations = document.getElementsByClassName('btn-primary')[0];

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');
    let request = new XMLHttpRequest();
    request.open('GET', 'js/data.json');
    request.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    request.send();
    console.log('req send');

    request.addEventListener('readystatechange', function () {
        if (request.readyState === 4 && request.status == 200) {
            
            organizations = JSON.parse(request.response);
            console.log('Organizations: ', organizations);
            console.log(typeof organizations);

            var data = {
                "type": "FeatureCollection",
                "features": organizations
            };

            console.log('Data: ', data);

            ymaps.ready(init);

            function init() {
                var myMap = new ymaps.Map("map", {
                    center: [55.76, 37.64],
                    zoom: 10,
                    controls: ['geolocationControl', 'searchControl']
                });

                var searchControl = myMap.controls.get('searchControl');
                searchControl.options.set({
                    noPlacemark: true,
                    placeholderContent: 'Введите адрес'
                });
                searchControl.events.add('resultshow', function (e) {
                    highlightResult(searchControl.getResultsArray()[e.get('index')]);
                });

                myMap.controls.get('geolocationControl').events.add('locationchange', function (e) {
                    highlightResult(e.get('geoObjects').get(0));
                });

                var deliveryPoint = new ymaps.GeoObject({
                    geometry: {
                        type: 'Point'
                    },
                    properties: {
                        iconCaption: 'Адрес'
                    }
                }, {
                    preset: 'islands#redDotIconWithCaption',
                    draggable: false,
                    iconCaptionMaxWidth: '215'
                });
                myMap.geoObjects.add(deliveryPoint);

                function highlightResult(obj) {
                    var coords = obj.geometry.getCoordinates();
                    deliveryPoint.geometry.setCoordinates(coords);
                    buildRoutes(obj);
                }

                var points = ymaps.geoQuery(data).addToMap(myMap);
                points.setOptions('preset', 'islands#blueStretchyIcon')

                var route_dests = [];

                function buildRoutes(origin) {
                    clearRoutes(route_dests);
                    var destinations = [];
                    var circle = new ymaps.Circle([origin.geometry.getCoordinates(), 3000]);
                    myMap.geoObjects.add(circle);
                    points.searchInside(circle).each(function (o) {
                        destinations.push(o);
                    });
                    myMap.geoObjects.remove(circle);
                    if (destinations.length === 0) {
                        destinations = [points.getClosestTo(origin)];
                    }
                    destinations.forEach(function (dest) {
                        var multiRoute = new ymaps.multiRouter.MultiRoute({
                            referencePoints: [
                                origin.geometry.getCoordinates(),
                                dest.geometry.getCoordinates()
                            ],
                            params: {
                                results: 1
                            }
                        }, {
                            boundsAutoApply: true,
                            wayPointVisible: false
                        });
                        myMap.geoObjects.add(multiRoute);
                        multiRoute.model.events.add("requestsuccess", function (event) {
                            var route = event.get("target").getRoutes()[0];
                            dest.properties.set({
                                iconContent: route.properties.get("distance").text + ', ' +
                                    route.properties.get("duration").text
                            });
                        });
                        route_dests.push([multiRoute, dest]);
                    });
                }

                function clearRoutes(route_dests) {
                    route_dests.forEach(function (route_dest) {
                        myMap.geoObjects.remove(route_dest[0]);
                        route_dest[1].properties.set({
                            iconContent: ''
                        });
                    });
                    route_dests = [];
                }
            }

        }
    });
});