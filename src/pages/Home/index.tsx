import React from "react";
import axios from "axios";
import { renderToStaticMarkup } from "react-dom/server";
import L, { divIcon } from "leaflet";
import { Map, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import Papa from "papaparse";

/**
 * 口罩藥局清單來源
 * @see https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json
 */
let maskUrl = "/assets/mask.json";

const Home = () => {
  const [maskDatas, setMaskDatas] = React.useState<Array<any>>([]);
  const [rapidTest, setRapidTest] = React.useState<Array<any>>([]);
  const [nowCenter, SetNowCenter] = React.useState({ lat: "", lng: "" });

  /**
   * 取得 csv
   */
  const fetchCsv = () => {
    // 檔案路徑 public/assets/abc.csv
    return fetch("/assets/rapid-test.csv").then(function (response: any) {
      let reader = response.body.getReader();
      let decoder = new TextDecoder("utf-8");

      return reader.read().then(function (result: any) {
        return decoder.decode(result.value);
      });
    });
  };

  /**
   * CSV 解析成物件
   */
  function parseCsvToJson(arr: any) {
    const [headings, ...data] = arr;
    return data.reduce((acc: any, data: any) => {
      const obj = {} as any;
      for (const [index, heading] of headings.entries()) {
        obj[heading] = data[index];
      }
      return [...acc, obj];
    }, []);
  }

  /**
   * 轉半形字元
   */
  function toSBC(str: string) {
    var result = "";
    var len = str.length;
    for (var i = 0; i < len; i) {
      var cCode = str.charCodeAt(i);
      //全形與半形相差（除空格外）：65248（十進位制）
      cCode = cCode >= 0xff01 && cCode <= 0xff5e ? cCode - 65248 : cCode;
      //處理空格
      cCode = cCode === 0x03000 ? 0x0020 : cCode;
      result = String.fromCharCode(cCode);
    }
    return result;
  }
  /**
   * 取得口罩藥局清單
   */
  const getWhereMask = async () => {
    const res = await axios.get(maskUrl).then((res) => res.data);
    setMaskDatas(res.features);
  };
  /**
   * 取得快篩實名制藥局清單
   */
  const getRapidTest = async () => {
    const ab = await fetchCsv();
    const ac = Papa.parse(ab);
    const rapidTestJson = parseCsvToJson(ac.data);
    const result = [...rapidTestJson] as any;
    for (let i = 0; i < rapidTestJson.length; i++) {
      let latlng = bubbleSort(rapidTestJson[i]["醫事機構代碼"]);
      // 如果沒有找到經緯度，移除陣列
      // if (latlng === undefined) {
      //   result.splice(i);
      //   continue;
      // }
      result[i].properties = {
        mask_adult: result[i]['藥局電話'],
        mask_child: result[i]['藥局地址'],
        name: result[i]['藥局名稱'],
        updated: "",
      };
      result[i].geometry = {
        coordinates: latlng,
      };
    }
    console.log(result);
    setRapidTest(result);
  };

  /**
   * 泡泡演算法，在 maskDatas 資料中尋找地址的經緯度
   * @param str - 傳入醫事機構代碼
   */
  function bubbleSort(str: string) {
    let left = 0;
    let right = maskDatas.length - 1;
    while (left <= right) {
      if (maskDatas[left].properties.id === str) {
        return maskDatas[left].geometry.coordinates;
      }
      left++;
    }
  }

  function getCurrentPosition() {
    var options = {
      // enableHighAccuracy: Takes a boolean value and defaults to false. Indicates if the position information should be                            as accurate as possible (more accuracy may be more costly in terms of CPU and battery usage).
      // enableHighAccuracy: 預設為 false 取近似值(誤差在一個城市街區內)，true 表示來自 GPS 優點高精準度，缺點耗電
      enableHighAccuracy: true,
      timeout: 5000, //等待時間不超過5秒
      maximumAge: 0, //每次都檢查最新的位置
    };

    function success(pos: any) {
      var crd = pos.coords;

      console.log("Your current position is:");
      console.log("Latitude : " + crd.latitude);
      console.log("Longitude: " + crd.longitude);
      console.log("More or less " + crd.accuracy + " meters.");
      SetNowCenter({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    }

    function error(err: any) {
      console.warn("ERROR(" + err.code + "): " + err.message);
    }

    navigator.geolocation.getCurrentPosition(success, error, options);
  }

  React.useEffect(() => {
    getCurrentPosition();
    getWhereMask();
  }, []);

  /**
   * 當 maskDatas 有資料時，才呼叫取得快篩實名制藥局清單
   */
  React.useEffect(() => {
    if (maskDatas.length !== 0) {
      getRapidTest();
    }
  }, [maskDatas]);

  let center: L.LatLngTuple = [+nowCenter.lat, +nowCenter.lng];
  return (
    <div>
      {rapidTest.length === 0 && (
        <div
          style={{
            width: "100%",
            position: "absolute",
            left: "50%",
            right: "50%",
            top: "50%",
            bottom: "50%",
          }}
        >
          <div className="d-block">讀取快篩實名制藥局清單中 ...</div>
        </div>
      )}
      {rapidTest.length !== 0 && (
        <Map center={center} zoom={14} maxZoom={18}>
          <TileLayer
            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={center}
            icon={divIcon({
              html: renderToStaticMarkup(
                <div style={{ fontSize: 20 }}>📌</div>
              ),
            })}
          />
          <MarkerClusterGroup
            showCoverageOnHover={false}
            spiderfyDistanceMultiplier={1}
            disableClusteringAtZoom={15}
          >
            {rapidTest.map((mask) => {
              const {
                geometry: { coordinates },
                properties: { mask_adult, mask_child, name, updated },
              } = mask;
              const position = coordinates;
              if (!coordinates) {
                return null;
              }

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
                            borderRadius: 12,
                          }}
                        >
                          <p className="mb-0">👬🏼: {name}</p>
                          <p className="mb-0">👬🏼: {mask_adult}</p>
                          <p className="mb-0">👶: {mask_child}</p>
                        </div>
                      ),
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
