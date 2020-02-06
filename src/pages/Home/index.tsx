import React, { Component } from "react";
import axios from "axios";
import { renderToStaticMarkup } from "react-dom/server";
import L, { divIcon } from "leaflet";
import { Map, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";

let maskUrl =
  "https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json";

const Home = () => {
  const [maskDatas, setMaskDatas] = React.useState([]);
  const [nowCenter, SetNowCenter] = React.useState({ lat: "", lng: "" });
  const getWhereMask = async () => {
    const res = await axios.get(maskUrl).then(res => res.data);
    setMaskDatas(res.features);
  };

  React.useEffect(() => {
    var options = {
      // enableHighAccuracy: Takes a boolean value and defaults to false. Indicates if the position information should be                            as accurate as possible (more accuracy may be more costly in terms of CPU and battery usage).
      // enableHighAccuracy: 預設為 false 取近似值(誤差在一個城市街區內)，true 表示來自 GPS 優點高精準度，缺點耗電
      enableHighAccuracy: true,
      timeout: 5000, //等待時間不超過5秒
      maximumAge: 0 //每次都檢查最新的位置
    };

    function success(pos: any) {
      var crd = pos.coords;

      console.log("Your current position is:");
      console.log("Latitude : " + crd.latitude);
      console.log("Longitude: " + crd.longitude);
      console.log("More or less " + crd.accuracy + " meters.");
      SetNowCenter({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
    }

    function error(err: any) {
      console.warn("ERROR(" + err.code + "): " + err.message);
    }

    navigator.geolocation.getCurrentPosition(success, error, options);
    getWhereMask();
  }, []);
  let center: L.LatLngTuple = [+nowCenter.lat, +nowCenter.lng];
  return (
    <div>
      {maskDatas.length === 0 && (
        <div
          style={{
            width: "100%",
            position: "absolute",
            left: "50%",
            right: "50%",
            top: "50%",
            bottom: "50%"
          }}
        >
          <div className="d-block">口罩哩麥造，努力讀取中 ...</div>
        </div>
      )}
      {maskDatas.length !== 0 && (
        <Map center={center} zoom={14} maxZoom={18}>
          <TileLayer
            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={center}
            icon={divIcon({
              html: renderToStaticMarkup(<div style={{ fontSize: 20 }}>📌</div>)
            })}
          />
          <MarkerClusterGroup
            showCoverageOnHover={false}
            spiderfyDistanceMultiplier={1}
            disableClusteringAtZoom={15}
          >
            {maskDatas.map((mask, idx) => {
              const {
                geometry: { coordinates },
                properties: { mask_adult, mask_child, name, updated },
                id
              } = mask;
              const position = coordinates;
              //   const propertiesProps: {
              //     id: number;
              //     name: String;
              //     phone: String;
              //     address: String;
              //     mask_adult: number;
              //     mask_child: number;
              //     updated: String;
              //     available: String;
              //     note: String;
              //     mark_delivered: number;
              //   } = properties;
              return (
                <div>
                  <Marker
                    position={[position[1], position[0]]}
                    icon={divIcon({
                      html: renderToStaticMarkup(
                        <div
                          style={{
                            backgroundColor: "#fff",
                            width: 80,
                            padding: "1px 10px",
                            borderRadius: 12
                          }}
                        >
                          <p className="mb-0">👬🏼: {mask_adult}</p>
                          <p className="mb-0">👶: {mask_child}</p>
                        </div>
                      )
                    })}
                  >
                    <Popup>
                      <div>
                        <p>店名: {name}</p>
                        <p>更新時間: {updated}</p>
                        {/* <p>👬🏼: {properties.mask_adult}</p> */}
                        {/* <p>👶: {properties.mask_child}</p> */}
                        {/* <p>店名: {properties.name}</p> */}
                        {/* <p>店名: {properties.name}</p> */}
                        {/* <p>店名: {properties.name}</p> */}
                      </div>
                    </Popup>
                  </Marker>
                </div>
              );
            })}
          </MarkerClusterGroup>
        </Map>
      )}
    </div>
  );
};

export default Home;
