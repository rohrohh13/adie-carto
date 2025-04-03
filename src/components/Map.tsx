import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import Slider from "@mui/material/Slider";
import { Feature } from 'geojson';
import { Layer } from 'leaflet';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Drawer from "@mui/material/Drawer";
import PhoneIcon from "@mui/icons-material/Phone";
import MailIcon from '@mui/icons-material/Mail';
import LanguageIcon from "@mui/icons-material/Language";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import CloseIcon from "@mui/icons-material/Close";
import { Switch } from "@mui/material";

interface Department {
  nom?: string;
  population?: number;
  lieu?: string;
  lieu_deux?: string;
  lieu_trois?: string;
  lieu_quatre?: string;
  telephone?: string;
  site_web?: string;
  email?: string;
  elus?: Elu[];
}

interface Elu {
  Nom: string;
  Prénom: string;
  "Libellé de la fonction"?: string;
  "Délégation"?: string;
  "Date de naissance"?: string;
  "Libellé de la catégorie socio-professionnelle"?: string;
  "Date de début du mandat"?: string;
}


const Map = () => {
  const position: [number, number] = [43.6, 3.25];
const [departementsData, setDepartementsData] = useState<GeoJSON.GeoJsonObject | null>(null);
const [epciData, setEpciData] = useState<GeoJSON.GeoJsonObject | null>(null);
const [communesData, setCommunesData] = useState<GeoJSON.GeoJsonObject | null>(null);

  const [scale, setScale] = useState(0); // 0 = Départements, 1 = EPCI, 2 = Communes
  const [openDrawer, setOpenDrawer] = useState(false); // État pour contrôler l'ouverture du Drawer
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [elusData, setElusData] = useState({ departements: [], epci: [], communes: [] }); // Données des élus
  const [selectedElu, setSelectedElu] = useState<Elu | null>(null);
  const [openEluDrawer, setOpenEluDrawer] = useState(false); // État pour contrôler l'ouverture du Drawer des élus
  const [financeFilter, setFinanceFilter] = useState(false);
  const [contactFilter, setContactFilter] = useState(false);

  useEffect(() => {
    // Charger les données géographiques
    fetch("/departements-ori.geojson")
      .then((response) => response.json())
      .then((data) => setDepartementsData(data));

    fetch("/epci.geojson")
      .then((response) => response.json())
      .then((data) => setEpciData(data));

    fetch("/communes.geojson")
      .then((response) => response.json())
      .then((data) => setCommunesData(data));

    // Charger les données des élus
    fetch("https://opensheet.elk.sh/1h7b8migggCOfZPKuH_uF14hLkL7LSDP3JyBQWIsHEUo/Feuille%201")
      .then((response) => response.json())
      .then((data) => setElusData((prev) => ({ ...prev, epci: data })));

    fetch("https://opensheet.elk.sh/1MH9fBSOkJ0gLKtakq5pt-eK93XeA_hUGm5i2Ydot3ic/Feuille%201")
      .then((response) => response.json())
      .then((data) => setElusData((prev) => ({ ...prev, communes: data })));

    fetch("https://opensheet.elk.sh/1tztvQvsSmV667Y10Z_Zf9utevKAmOI3qCjpJ4kP5-uU/Feuille%201")
      .then((response) => response.json())
      .then((data) => setElusData((prev) => ({ ...prev, departements: data })));
  }, []);

const onEachFeature = (feature: Feature, layer: Layer) => {
  const properties = feature.properties;
  if (!properties) {
    return;
  }

  const label = properties.NOM || properties.nom || properties.NOM_M;
  if (label) {
    layer.bindTooltip(label, { permanent: false, direction: "top" });
  }

  layer.on("click", () => {
    if (scale === 0) {
      // Départements
      setSelectedDepartment(properties);
      setOpenDrawer(true);
    } else if (scale === 1) {
      // EPCI : correspondance avec Numero SIREN
      const siren = properties.code;
      const elusEpci = elusData.epci.filter(elu => String(elu["Siren"]) === String(siren));
      setSelectedDepartment({ ...properties, elus: elusEpci });
      setOpenDrawer(true);
    } else if (scale === 2) {
      // Communes : correspondance avec Code commune
      const inseeCom = properties.INSEE_COM;
      const elusCommune = elusData.communes.filter(elu => String(elu["Code commune"]) === String(inseeCom));
      setSelectedDepartment({ ...properties, elus: elusCommune });
      setOpenDrawer(true);
    }
  });
};


  const getColor = (feature: any) => {
    // Vérifier que les propriétés existent pour chaque type de géodonnée
    console.log("Feature properties:", feature.properties);

    if (financeFilter && feature.properties?.finance === "oui") {
      return "#00FF00"; // Vert pour les polygones finance
    } else if (contactFilter && feature.properties?.contact === "oui") {
      return "#FF0000"; // Rouge pour les polygones contact
    }

    // Si aucun filtre n'est appliqué, renvoyer une couleur par défaut
    return "";
  };

  // Fonction pour reformater la date
  function parseDate(dateStr: any) {
    const parts = dateStr.split("/");  // Sépare la date par "/"
    if (parts.length === 3) {
      // Reformate la date en "YYYY-MM-DD"
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(dateStr);  // Retourne la date brute si ce n'est pas un format DD/MM/YYYY
  }

  // Fonction pour calculer l'âge
  const calculateAge = (birthDate: any) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    // Si l'anniversaire n'est pas encore passé cette année, on soustrait 1 à l'âge
    if (month < birth.getMonth() || (month === birth.getMonth() && day < birth.getDate())) {
      age--;
    }

    return age;
  };

  const handleEluClick = (elu: any) => {
    setSelectedElu(elu);
    setOpenEluDrawer(true);
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {/* Sélecteur avec Slider Material UI */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: 20,
          transform: "translateY(-50%)",
          zIndex: 1000,
          height: 150,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" sx={{ mb: 1, fontWeight: "bold" }}>
          Échelle
        </Typography>
        <Slider
          orientation="vertical"
          value={scale}
          min={0}
          max={2}
          step={1}
          marks={[
            { value: 0, label: "Départements" },
            { value: 1, label: "EPCI" },
            { value: 2, label: "Communes" },
          ]}
          sx={{
            '& .MuiSlider-thumb': {
              width: 20,
              height: 20,
              backgroundColor: "black",
            },
            '& .MuiSlider-track': {
              backgroundColor: "black",
            },
            '& .MuiSlider-rail': {
              backgroundColor: "gray",
            },
          }}
          onChange={(_, newValue) => setScale(newValue as number)}
        />
      </Box>
      <Box
        sx={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box display="flex" alignItems="center">
          <Typography>Finance</Typography>
          <Switch
            checked={financeFilter}
            onChange={(event) => setFinanceFilter(event.target.checked)}
            color="primary"
          />
        </Box>
        <Box display="flex" alignItems="center">
          <Typography>Contact</Typography>
          <Switch
            checked={contactFilter}
            onChange={(event) => setContactFilter(event.target.checked)}
            color="primary"
          />
        </Box>
      </Box>
      {/* Carte Leaflet */}
      <MapContainer center={position} zoom={9} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <GeoJSON
          data={departementsData!}
          style={(feature) => ({ color: getColor(feature), weight: 1 })}
          onEachFeature={onEachFeature}
        />

        {/* Affichage conditionnel selon l'échelle sélectionnée */}
        {scale === 0 && departementsData && (
          <GeoJSON
            data={departementsData}
            style={(feature) => ({
              color: getColor(feature) || "#DBFF3B", // Couleur par défaut pour les départements
              weight: 1
            })}
            onEachFeature={onEachFeature}
          />
        )}
        {scale === 1 && epciData && (
          <GeoJSON
            data={epciData}
            style={(feature) => ({
              color: getColor(feature) || "#FF4ACC", // Couleur par défaut pour les EPCI
              weight: 1,
              fillOpacity: 0.3
            })}
            onEachFeature={onEachFeature}
          />
        )}
        {scale === 2 && communesData && (
          <GeoJSON
            data={communesData}
            style={(feature) => ({
              color: getColor(feature) || "#9747FF", // Couleur par défaut pour les communes
              weight: 1,
              fillOpacity: 0.2
            })}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
      <div className="footer">
        <div className="footerUn">
          <a href="https://datack.fr" target="_blank">
            <img src="/logo-datack.png"/>
          </a>
          <span>Map</span>
        </div>
        <div className="footerDeux">
          <span>Cibler, trier et récupérer vos contacts</span>
        </div>
      </div>
      {/* Drawer avec les informations du département */}
      <Drawer
        anchor="left"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        sx={{ width: 355 }}
      >
        <div style={{ position: "relative" }} className="headerDerawerUn">
          {/* Bouton de fermeture */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="close"
            onClick={() => setOpenDrawer(false)}
            sx={{ position: 'absolute', right: 20, top: 20 }}
          >
            <CloseIcon />
          </IconButton>

          <h2 className="drawerListeTitle">
            {scale === 0 && (selectedDepartment?.nom || "Département non renseigné")}
            {scale === 1 && (selectedDepartment?.nom || "EPCI non renseigné")}
            {scale === 2 && (selectedDepartment?.nom || "Commune non renseignée")}
          </h2>
          <p className="drawerListeNumber">{selectedDepartment?.population} habitants</p>
          {(selectedDepartment?.lieu || selectedDepartment?.lieu_deux || selectedDepartment?.lieu_trois || selectedDepartment?.lieu_quatre) && (
            <div className="adresseColl">
              <h3>Adresse :</h3>
              <p>{selectedDepartment?.lieu}</p>
              <p>{selectedDepartment?.lieu_deux}</p>
              <p>{selectedDepartment?.lieu_trois}</p>
              <p>{selectedDepartment?.lieu_quatre}</p>
            </div>
          )}
          {(selectedDepartment?.telephone || selectedDepartment?.site_web || selectedDepartment?.email) && (
            <div className="contactColl">
              <h3>Contact</h3>

              {/* Vérification pour afficher le téléphone seulement s'il existe */}
              {selectedDepartment?.telephone && (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <PhoneIcon />
                  <p>{selectedDepartment?.telephone}</p>
                </div>
              )}

              {/* Vérification pour afficher le site web seulement s'il existe */}
              {selectedDepartment?.site_web && (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <LanguageIcon />
                  <a href={selectedDepartment?.site_web} target="_blank" rel="noopener noreferrer">
                    {selectedDepartment?.site_web}
                  </a>
                </div>
              )}

              {/* Vérification pour afficher l'email seulement s'il existe */}
              {selectedDepartment?.email && (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <MailIcon />
                  <a href={`mailto:${selectedDepartment?.email}`} target="_blank" rel="noopener noreferrer">
                    {selectedDepartment?.email}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Afficher les informations des élus */}
          <div>
            <div className="drawerUnGroupeInfo">
              <div
                style={{
                  marginLeft: '15px',
                }}
              />
              <h3>Élus</h3>
            </div>
            {scale === 0 && (
              <>
                {/* Séparer les élus ayant une fonction et ceux n'en ayant pas */}
                {elusData.departements
                  .sort((a, b) => {
                    const hasFunctionA = a["Libellé de la fonction"];
                    const hasFunctionB = b["Libellé de la fonction"];
                    if (hasFunctionA && !hasFunctionB) return -1;
                    if (!hasFunctionA && hasFunctionB) return 1;
                    return 0;
                  })
                  .map((elu, index: number) => (
                    <div
                      key={index}
                      onClick={() => handleEluClick(elu)}
                      style={{ cursor: "pointer" }}
                      className="drawerUnGroupeBlocDepute"
                    >
                      <div className="drawerUnGroupeBlocDeputeFlex">
                        <div className="drawerUnGroupeBlocDeputeFlexDeux">
                          <div>
                            <h4>{elu["Nom"] || ""} {elu["Prénom"] || ""}</h4>
                            <p>{elu["Libellé de la fonction"] || ""}</p>
                          </div>
                        </div>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.625 2.8125L10.3125 7.5L5.625 12.1875" stroke="black" stroke-width="0.9375" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ))}
              </>
            )}

            {scale === 1 && selectedDepartment && selectedDepartment.elus && selectedDepartment.elus.length > 0 && (
              <>
                {selectedDepartment.elus
                  .sort((a, b) => {
                    const hasFunctionA = a["Libellé de la fonction"];
                    const hasFunctionB = b["Libellé de la fonction"];
                    if (hasFunctionA && !hasFunctionB) return -1;
                    if (!hasFunctionA && hasFunctionB) return 1;
                    const functionA = a["Libellé de la fonction"] || "";
                    const functionB = b["Libellé de la fonction"] || "";
                    return functionA.localeCompare(functionB);
                  })
                  .map((elu, index: number) => (
                    <div
                      key={index}
                      onClick={() => handleEluClick(elu)}
                      style={{ cursor: "pointer" }}
                      className="drawerUnGroupeBlocDepute"
                    >
                      <div className="drawerUnGroupeBlocDeputeFlex">
                        <div className="drawerUnGroupeBlocDeputeFlexDeux">
                          <div>
                            <h4>{elu.Nom} {elu.Prénom}</h4>
                            <p>{elu["Libellé de la fonction"] || ""}</p>
                          </div>
                        </div>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.625 2.8125L10.3125 7.5L5.625 12.1875" stroke="black" stroke-width="0.9375" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ))}
              </>
            )}

            {scale === 2 && selectedDepartment && selectedDepartment.elus && selectedDepartment.elus.length > 0 && (
              <>
                {selectedDepartment.elus
                  .sort((a, b) => {
                    const hasFunctionA = a["Libellé de la fonction"];
                    const hasFunctionB = b["Libellé de la fonction"];
                    if (hasFunctionA && !hasFunctionB) return -1;
                    if (!hasFunctionA && hasFunctionB) return 1;
                    const functionA = a["Libellé de la fonction"] || "";
                    const functionB = b["Libellé de la fonction"] || "";
                    return functionA.localeCompare(functionB);
                  })
                  .map((elu, index: number) => (
                    <div
                      key={index}
                      onClick={() => handleEluClick(elu)}
                      style={{ cursor: "pointer" }}
                      className="drawerUnGroupeBlocDepute"
                    >
                      <div className="drawerUnGroupeBlocDeputeFlex">
                        <div className="drawerUnGroupeBlocDeputeFlexDeux">
                          <div>
                            <h4>{elu.Nom} {elu.Prénom}</h4>
                            <p>{elu["Libellé de la fonction"] || ""}</p>
                          </div>
                        </div>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.625 2.8125L10.3125 7.5L5.625 12.1875" stroke="black" stroke-width="0.9375" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ))}
              </>
            )}


          </div>
        </div>
      </Drawer>

      {/* Drawer avec les informations détaillées de l'élu */}
      <Drawer
        anchor="left"
        open={openEluDrawer}
        onClose={() => setOpenEluDrawer(false)}
        sx={{ width: 350 }}
      >
        <div className="drawerElu" style={{ padding: "16px", position: "relative" }}>
          {/* Bouton de fermeture */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="close"
            onClick={() => setOpenEluDrawer(false)}
            sx={{ position: 'absolute', left: 20, top: 20 }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="close"
            onClick={() => setOpenEluDrawer(false)}
            sx={{ position: 'absolute', right: 20, top: 20 }}
          >
            <CloseIcon />
          </IconButton>
          <div className="headerDeputeSelect">
            <p>
              {scale === 0 && "Département : "}
              {scale === 0 ? (
                selectedDepartment?.nom || "Département non renseigné"
              ) : scale === 1 ? (
                // Affichage pour l'EPCI
                selectedDepartment?.nom || "EPCI non renseigné"
              ) : scale === 2 ? (
                // Affichage pour la commune
                selectedDepartment?.nom || "Commune non renseignée"
              ) : (
                "Pas de donnée disponible pour cet échelon"
              )}
            </p>
            <h2>
              {selectedElu?.Prénom} {selectedElu?.Nom}
            </h2>
          </div>
          <div>
            {selectedElu?.["Libellé de la fonction"] && (
              <p>Fonction : {selectedElu["Libellé de la fonction"]}</p>
            )}
            {selectedElu?.["Délégation"] && (
              <p>Délégation : {selectedElu["Délégation"]}</p>
            )}
          </div>
          <div>
            <div>
              {selectedElu?.["Date de naissance"] ? (
                (() => {
                  const birthDateStr = selectedElu["Date de naissance"];
                  const birthDate = parseDate(birthDateStr);
                  if (isNaN(birthDate.getTime())) {
                    return <div>Âge non disponible (date invalide)</div>;
                  }
                  return <div>Age : {calculateAge(birthDate)} ans</div>;
                })()
              ) : (
                <div>Âge non disponible (date manquante)</div>
              )}
            </div>
            <div>CSP : {selectedElu?.["Libellé de la catégorie socio-professionnelle"]}</div>
            <div>Date de début du mandat : {selectedElu?.["Date de début du mandat"]}</div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Map;
