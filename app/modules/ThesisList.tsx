import { StyleSheet, ActivityIndicator, FlatList, Text, View, TextInput, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ThesisBox } from "@/components/moduleComps/ThesisBox";
import { Hoverable } from "react-native-web-hover";
import { config } from "../config";
import { DownloadCsv } from "../components/DownloadCsv";
import { SelectBox } from "../components/UI/SelectBox";
import { UniversitySelectDropdown, YearRangeDropdown } from "../components/UI/DropdownBox";
import { SingleThesis } from "./SingleThesis";
import { ModalWindow } from "../components/UI/ModalWindow";

const uniCodes = [
  {"uni": "All", "code": "all"},
  {"uni": "All UAS", "code": "allUas"},
  {"uni": "All Universities", "code": "allUniversities"},
  {"uni": "Centria UAS", "code": "10024%2F1900"},
  {"uni": "Diakonia UAS", "code": "10024%2F1552"},
  {"uni": "Haaga-Helia UAS", "code": "10024%2F431"},
  {"uni": "Hämeen UAS", "code": "10024%2F1766"},
  {"uni": "Humanistinen UAS", "code": "10024%2F2050"},
  {"uni": "Jyväskylä UAS", "code": "10024%2F5"},
  {"uni": "Kaakkois-suomen UAS", "code": "10024%2F12136"},
  {"uni": "Kajaani UAS", "code": "10024%2F1967"},
  {"uni": "Karelia UAS", "code": "10024%2F1620"},
  {"uni": "Kymenlaakson UAS", "code": "10024%2F1493"},
  {"uni": "Lab UAS", "code": "10024%2F266372"},
  {"uni": "Lahden UAS", "code":"10024%2F10"},
  {"uni": "Lapin UAS", "code": "10024%2F69720"},
  {"uni": "Laurea UAS", "code": "10024%2F12"},
  {"uni": "Metropolia UAS", "code": "10024%2F6"},
  {"uni": "Mikkelin UAS", "code": "10024%2F2074"},
  {"uni": "Oulu UAS", "code": "10024%2F2124"},
  {"uni": "Poliisi UAS", "code": "10024%2F86551"},
  {"uni": "Saimaan UAS", "code": "10024%2F1567"},
  {"uni": "Satakunnan UAS", "code": "10024%2F14"},
  {"uni": "Savonia UAS", "code": "10024%2F1476"},
  {"uni": "Seinäjoen UAS", "code": "10024%2F1"},
  {"uni": "Tampere UAS", "code": "10024%2F13"},
  {"uni": "Turun UAS", "code": "10024%2F15"},
  {"uni":  "Vaasa UAS", "code": "10024%2F1660"},
  {"uni": "Yrkeshögskolan Arcada UAS", "code": "10024%2F4"},
  {"uni":  "Yrkeshögskolan Novia UAS", "code": "10024%2F2188"},
  {"uni": "Aalto University", "code": "AALTO"},
  {"uni": "University of Helsinki", "code": "HELDA"},
  {"uni": "Tampere University", "code": "TREPO"},
  {"uni": "Oulu University", "code": "OULUREPO"},
  {"uni": "LUT University", "code": "LUTPUB"}
];

const allUasCodes = uniCodes
  .filter(({ code }) =>
    code !== "all" &&
    code !== "allUas" &&
    code !== "allUniversities" &&
    code.startsWith("10024%2F")
  )
  .map(({ code }) => code);

const allUniversityCodes = uniCodes
  .filter(({ code }) =>
    code !== "all" &&
    code !== "allUas" &&
    code !== "allUniversities" &&
    !code.startsWith("10024%2F")
  )
  .map(({ code }) => code);

const mainOptions = [
  { uni: "All", code: "all" },
  { uni: "All UAS", code: "allUas" },
  { uni: "All Universities", code: "allUniversities" },
];

const uasOptions = uniCodes.filter(
  u => u.code.startsWith("10024%2F")
);

const universityOptions = uniCodes.filter(
  u =>
    !u.code.startsWith("10024%2F") &&
    !["all", "allUas", "allUniversities"].includes(u.code)
);

const API_BASE_URL = config.API_BASE_URL;
// number of theses to fetch per university when a specific university is selected (increased to get more data for relevance filtering)
const RPP = 1;

export default function ThesisList() {
  const [open, setOpen] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [searchedUni, setSearchedUni] = useState("");
  const [theses, setTheses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("");
  const [startYear, setStartYear] = useState<string>("");
  const [endYear, setEndYear] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Add this utility function to format handles correctly
  const getValidHandle = (item: any) => {
    const handle = item?.handle || item?.thesis?.handle || "";
    // Ensure the handle is properly formatted for routing
    if (typeof handle === 'string') {
      if (handle.startsWith('/handle/')) {
        return handle;
      } else if (handle.startsWith('http')) {
        // Extract handle from URL if it's a full URL
        const matches = handle.match(/\/handle\/(.+)$/);
        return matches ? `/handle/${matches[1]}` : handle;
      }
    }
    return `/handle/${handle.replace(/^#/, '')}`;
  };

  // Fetches thesis list, runs when user clicks search button
  useEffect(() => {
    if (!searchedUni) return;
    const fetchTheses = async () => {
      setError(null);
      setLoading(true);

      try {
        console.log("Fetching Nokia-related thesis data from theseus.fi via server...");

        let fetchedData = [];

        if (searchedUni.includes(",")) {
          const uniCodeList = searchedUni.split(",");

          const allPromises = uniCodeList.map(async (uniCode) => {
            try {
              const uniResponse = await fetch(
                `${API_BASE_URL}/uni/${uniCode}?query=nokia&rpp=${RPP}`
              );

              if (uniResponse.ok) {
                const uniData = await uniResponse.json();
                const uniInfo = uniCodes.find(u => u.code === uniCode);

                return uniData.map((thesis: any) => ({
                  ...thesis,
                  universityCodeStr: uniCode,
                  _universityName: uniInfo ? uniInfo.uni : null
                }));
              }

              return [];
            } catch (error) {
              console.warn(`Error fetching from university ${uniCode}:`, error);
              return [];
            }
          });

          const results = await Promise.all(allPromises);
          fetchedData = results.flat();
        } else if (searchedUni === "all") {
          // When "All" is selected, fetch from multiple major universities
          setLoading(true);

          const uniCodeList = uniCodes
          .filter(({ code }) => code !== "all")
          .map(({ code }) => code);
          // Fetch from each university with increased results per page
          const allPromises = uniCodeList.map(async (uniCode) => {
            try {
              const uniResponse = await fetch(`${API_BASE_URL}/uni/${uniCode}?query=nokia&rpp=${RPP}`);
              if (uniResponse.ok) {
                const uniData = await uniResponse.json();

                // Add university information to theses that are missing it
                const uniInfo = uniCodes.find(u => u.code === uniCode);
                //
                const enhancedUniData = uniData.map((thesis: any) => ({
                  ...thesis,
                  universityCodeStr: uniCode,
                  _universityName: uniInfo ? uniInfo.uni : null  // Store original university name
                }));
                console.log("enhancedUniData", enhancedUniData);
                return enhancedUniData;
              }
              return [];
            } catch (error) {
              console.warn(`Error fetching from university ${uniCode}:`, error);
              return [];
            }
          });

          // Wait for all requests to complete
          const results = await Promise.all(allPromises);

          // Combine all results
          fetchedData = results.flat();

          console.log(`Combined ${fetchedData.length} Nokia-related thesis items from multiple universities`);
        } else if (searchedUni === "allUas" || searchedUni === "allUniversities") {
          const uniCodeList =
            searchedUni === "allUas" ? allUasCodes : allUniversityCodes;

          const allPromises = uniCodeList.map(async (uniCode) => {
            try {
              const uniResponse = await fetch(
                `${API_BASE_URL}/uni/${uniCode}?query=nokia&rpp=${RPP}`
              );

              if (uniResponse.ok) {
                const uniData = await uniResponse.json();
                const uniInfo = uniCodes.find(u => u.code === uniCode);

                return uniData.map((thesis: any) => ({
                  ...thesis,
                  universityCodeStr: uniCode,
                  _universityName: uniInfo ? uniInfo.uni : null
                }));
              }

              return [];
            } catch (error) {
              console.warn(`Error fetching from university ${uniCode}:`, error);
              return [];
            }
          });

          const results = await Promise.all(allPromises);
          fetchedData = results.flat();

          console.log(
            `Combined ${fetchedData.length} thesis items from ${
              searchedUni === "allUas" ? "all UAS" : "all universities"
            }`
          );
        } else {
          // For a specific university, proceed with the existing endpoint but with increased results
          const endpoint = `${API_BASE_URL}/uni/${searchedUni}?query=nokia&rpp=${RPP}`;

          console.log(`Using endpoint: ${endpoint}`);
          const response = await fetch(endpoint);

          if (response.status === 503) {
            throw new Error("Theseus.fi is temporarily unavailable. Please try again later.");
          }

          if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${await response.text()}`);
          }

          fetchedData = await response.json();
          console.log('fetched data: ', fetchedData);

          // Add university information
          const uniInfo = uniCodes.find(u => u.code === searchedUni);
          if (uniInfo) {
            fetchedData = fetchedData.map((thesis: any) => ({
              ...thesis,
              _universityName: uniInfo.uni  // Store original university name
            }));
          }

          console.log(`Received ${fetchedData.length} Nokia-related thesis items from theseus.fi`);
        }

        // Verify we got data
        if (fetchedData.length === 0) {
          throw new Error("No Nokia-related thesis data received from theseus.fi");
        }

        // Update state with enhanced data
        setTheses(fetchedData);
      } catch (error: unknown) {
        console.error("Error fetching Nokia thesis data:", error);
        setError(error instanceof Error ? error.message : "Failed to load Nokia-related theses.");
      } finally {
        setLoading(false);
      }
    };

    fetchTheses();
  }, [searchedUni]);

  const relevanceOrder: Record<string, number> = {
    NOKIA_COLLABORATION: 0,
    AMBIGUOUS: 1,
    NO_INDICATION_OF_COLLABORATION: 2,
    NOT_SCORED: 3,
  };

  // Add the current item to the export format array
  const exportCsvFormat = useMemo(() => {
    return theses.map(item => {
        const title = item.thesis?.title ?? "";
        const university = item.thesis?.publisher ?? "";
        const author = item.thesis?.author ?? "";
        const date = item.thesis?.year || item.thesis?.date || "";
        const nokiaScore = item._nokiaScore ?? item.thesis?._nokiaScore ?? 0;
        const handle = item?.thesis?.handle ?? item?.handle ?? "";
        const universityCode = item.thesis?.universityCode ?? "";

        const openAI_decision = item.openAI_decision ?? item.thesis?.openAI_decision ?? "unknown";

        const openAI_evidence = item.openAI_evidence ?? item.thesis?.openAI_evidence ?? "";

        let link = "";

        if (universityCode === "TREPO") {
          link = `https://trepo.tuni.fi${handle}`;
        } else if (universityCode === "AALTO") {
          link = `https://aaltodoc.aalto.fi${handle}`;
        } else if (universityCode === "HELDA") {
          link = `https://helda.helsinki.fi${handle}`;
        } else if (universityCode === "OULUREPO") {
          link = `https://oulurepo.oulu.fi${handle}`;
        } else if (universityCode === "LUTPUB") {
          link = `https://lutpub.lut.fi/${handle}`;
        } else {
          link = `https://www.theseus.fi${handle}`;
        }

        return {
          title,
          university,
          author,
          date,
          link,
          nokiaScore,
          openAI_decision,
          openAI_evidence
        };
    });
  }, [theses]);

  const getItemRelevance = (item: any) => {
    const rawNokiaRelevance = item?.thesis?._nokiaRelevance ?? item?._nokiaRelevance;
    const validNokiaLabels = ["NOKIA_COLLABORATION", "AMBIGUOUS", "NO_INDICATION_OF_COLLABORATION"];
    const hasKnownRelevance =
      typeof rawNokiaRelevance === "string" && validNokiaLabels.includes(rawNokiaRelevance);
    return hasKnownRelevance ? rawNokiaRelevance : "NOT_SCORED";
  };

  const getItemScore = (item: any) => {
    const rawScore = item?.thesis?._nokiaScore ?? item?._nokiaScore;
    if (rawScore === null || rawScore === undefined) {
      return -1;
    }

    const score = Number(rawScore);
    return Number.isNaN(score) ? -1 : score;
  };

  // Filter first, then sort by relevance label and score.
  const filteredTheses = theses
    .filter(thesis => {
      // Support both the nested and direct structures
      const title = thesis.title || thesis.thesis?.title || "";
      const author = thesis.author || thesis.thesis?.author || "";

      const year = thesis.year || thesis.thesis?.year || thesis.date || thesis.thesis?.date || "";
      const thesisYear = Number(year);
      const startYearNum = Number(startYear);
      const start = startYear === "" ? null : Number(startYear);
      const end = endYear === "" ? null : Number(endYear);

      const abstractByLanguage =
        thesis.abstractByLanguage ||
        thesis.thesis?.abstractByLanguage ||
        {};
      const abstract = Object.values(abstractByLanguage)
        .filter(value => typeof value === "string")
        .join(" ");

      const search = searchTerm.toLowerCase();

      //Search field -> title + abstract
      const matchesSearch =searchTerm === "" ||
      title.toLowerCase().includes(search) ||
      abstract.toLowerCase().includes(search);

      //Author field -> only author
      const matchesAuthor = selectedAuthor === "" || author.toLowerCase().includes(selectedAuthor.toLowerCase());

      //Year field -> only year
      // Check if thesis year falls within the specified range (if provided)
      const matchesYear =
      !Number.isNaN(thesisYear) &&
      (start === null || thesisYear >= start) &&
      (end === null || thesisYear <= end);

      return matchesSearch && matchesAuthor && matchesYear;
    })
    .sort((a, b) => {
      const aRelevanceRank = relevanceOrder[getItemRelevance(a)] ?? relevanceOrder.NOT_SCORED;
      const bRelevanceRank = relevanceOrder[getItemRelevance(b)] ?? relevanceOrder.NOT_SCORED;

      if (aRelevanceRank !== bRelevanceRank) {
        return aRelevanceRank - bRelevanceRank;
      }

      return getItemScore(b) - getItemScore(a);
    });
    console.log('After filtering: ', filteredTheses);

    const isSelected = (code: string) =>
      selectedItems.some(item => item.code === code);

  const selectUni = (option: any) => {
    if (option.code === "all") {
      const allRealOptions = [...uasOptions, ...universityOptions];
      const allSelected = allRealOptions.every(u => isSelected(u.code));

      setSelectedItems(allSelected ? [] : allRealOptions);
      return;
    }

    if (option.code === "allUas") {
      const allSelected = uasOptions.every(u => isSelected(u.code));

      setSelectedItems(prev =>
        allSelected
          ? prev.filter(item => !uasOptions.some(u => u.code === item.code))
          : [
              ...prev.filter(item => !uasOptions.some(u => u.code === item.code)),
              ...uasOptions
            ]
      );
      return;
    }

    if (option.code === "allUniversities") {
      const allSelected = universityOptions.every(u => isSelected(u.code));

      setSelectedItems(prev =>
        allSelected
          ? prev.filter(item => !universityOptions.some(u => u.code === item.code))
          : [
              ...prev.filter(item => !universityOptions.some(u => u.code === item.code)),
              ...universityOptions
            ]
      );
      return;
    }

    setSelectedItems(prev =>
      isSelected(option.code)
        ? prev.filter(item => item.code !== option.code)
        : [...prev, option]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by:</Text>

        <TextInput
          style={styles.searchBar}
          placeholder="Search for a thesis..."
          placeholderTextColor="#999"
          onChangeText={text => setSearchTerm(text)}
        />

        <View style={styles.filterRow}>
          <View style={styles.customDropdownWrapper}>
            <SelectBox
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
            />

            <UniversitySelectDropdown
              dropdownOpen={dropdownOpen}
              hoveredGroup={hoveredGroup}
              setHoveredGroup={setHoveredGroup}
              mainOptions={mainOptions}
              uasOptions={uasOptions}
              universityOptions={universityOptions}
              selectedItems={selectedItems}
              selectUni={selectUni}
            />
          </View>

          <TextInput
            style={styles.inputField}
            placeholder="Filter by author..."
            placeholderTextColor="#999"
            onChangeText={text => setSelectedAuthor(text)}
          />

          <YearRangeDropdown
            startYear={startYear}
            endYear={endYear}
            setStartYear={setStartYear}
            setEndYear={setEndYear}
          />

        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              if (selectedItems.length > 0) {
                setSearchedUni(selectedItems.map(item => item.code).join(","));
              } else {
                setSearchedUni("");
                setTheses([]);
              }
            }}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
          <View style={styles.downloadWrapper}>
            <DownloadCsv elements={exportCsvFormat} />
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setSearchedUni(selectedItem[1])}
          >
            <Text style={styles.searchButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
          <Text style={styles.loadingText}>Loading theses...</Text>
        </View>
      ) : filteredTheses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No Nokia-related theses found matching your criteria.</Text>
          <Text style={styles.emptySubText}>Try adjusting your search filters or selecting a different university.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.emptySubText}>Found {filteredTheses.length} theses</Text>
          <FlatList
            data={filteredTheses}
            numColumns={3}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }: { item: any }) => {
              // console.log("Rendering thesis item:", item);

              // Enhanced string extraction with improved fallbacks
              const title = String(item?.thesis?.title || item?.title || "Untitled Thesis");
              const author = String(item?.thesis?.author || item?.author || "Unknown Author");
              const year = String(item?.thesis?.year || item?.year || item?.thesis?.date || item?.date || "Unknown Date");
              const universityCode = String(item?.thesis?.universityCode || item?.universityCode || "unknown university code");
              const thesisId = String(item?.thesis?.thesisId || item?.thesisId || `unknown-id`);

              const openAI_decision = String(item?.thesis?.openAI_decision || item?.openAI_decision || 'unknown');
              const openAI_evidence = String(item?.thesis?.openAI_evidence || item?.openAI_evidence || 'unknown');

              // Enhanced publisher extraction with multiple fallbacks
              // First check if university name is stored directly (from our data enhancement)
              let publisher = "";
              let universitySource = ""; // For debugging

              if (item?._universityName) {
                publisher = String(item._universityName);
                universitySource = "stored university name";
              } else if (item?.thesis?.publisher) {
                publisher = String(item.thesis.publisher);
                universitySource = "thesis publisher";
              } else if (item?.publisher) {
                publisher = String(item.publisher);
                universitySource = "direct publisher";
              } else if (item?.thesis?.community) {
                publisher = String(item.thesis.community);
                universitySource = "thesis community";
              } else if (item?.community) {
                publisher = String(item.community);
                universitySource = "direct community";
              } else if (selectedItem[0] !== "All") {
                // If specific university is selected, use that
                publisher = String(selectedItem[0]);
                universitySource = "selected university";
              } else {
                // Only if all else fails, use a generic name
                publisher = "Finnish University";
                universitySource = "default fallback";
              }

              const nokiaRelevance = (openAI_decision) => {
                if (openAI_decision === "yes") {
                  return "NOKIA COLLABORATION";
                } else if (openAI_decision === "no") {
                  return "NO INDICATION OF COLLABORATION";;
                } else  {
                  return "AMBIGUOUS";
                }
              };

              const displayRelevance = nokiaRelevance(openAI_decision);

              // Define relevance indicator color
              let relevanceColor = "#95a5a6"; // Gray for not scored / unknown
              if (displayRelevance === "NOKIA COLLABORATION") {
                relevanceColor = "#2ecc71"; // Green for high
              } else if (displayRelevance === "AMBIGUOUS") {
                relevanceColor = "#f39c12"; // Orange for medium
              } else if (displayRelevance === "NO INDICATION OF COLLABORATION") {
                relevanceColor = "#e74c3c"; // Red for low
              }

              return (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedThesis({
                        item,
                        handle: getValidHandle(item),
                        thesisId,
                        title,
                        author,
                        year,
                        publisher,
                        universityCode,
                      });
                      setOpen(true);
                    }}
                  >
                    <View style={styles.thesisCardWrapper}>
                      <View
                        style={[
                          styles.relevanceIndicator,
                          { backgroundColor: relevanceColor },
                        ]}
                      >
                        <Text style={styles.relevanceText}>
                          {displayRelevance}
                        </Text>
                      </View>

                      <ThesisBox
                        title={title}
                        author={author}
                        year={year}
                        publisher={publisher}
                      />
                    </View>
                  </TouchableOpacity>

                  <ModalWindow
                    visible={
                      open &&
                      selectedThesis?.handle === getValidHandle(item)
                    }
                    onClose={() => {
                      setOpen(false);
                      setSelectedThesis(null);
                    }}
                  >
                    {selectedThesis && (
                      <SingleThesis
                        key={`${selectedThesis.handle}-${selectedThesis.thesisId}`}
                        handle={selectedThesis.handle}
                        thesisId={selectedThesis.thesisId}
                        title={selectedThesis.title}
                        author={selectedThesis.author}
                        year={selectedThesis.year}
                        publisher={selectedThesis.publisher}
                        universityCode={selectedThesis.universityCode}
                      />
                    )}
                  </ModalWindow>
                </>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "90%",
    minHeight: "100%",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  filterSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    zIndex: 9999,
    elevation: 9999,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center"
  },
  searchBar: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    backgroundColor: "#fff"
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  dropdownContainer: {
    flex: 1,
    marginRight: 10
  },
  uniSelected: {
    height: 38,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  uniSelector: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 5,
    backgroundColor: "#fff",
    marginVertical: 2
  },
  inputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    marginLeft: 10
  },
  searchButton: {
    alignSelf: "center",
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  buttonRow: {
    justifyContent: "center",
    alignItems: "center"
  },
  downloadWrapper: {
    position: "absolute",
    right: 0
  },
  loadingIndicator: {
    marginTop: 20
  },
  singleThesis: {
    margin: 10,
    flex: 1,
    maxWidth: "30%"
  },
  hovered: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",

    borderRadius: 10
  },
  hoveredText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  thesisCardWrapper: {
    position: 'relative',
    margin: 10,
    flex: 1,
    maxWidth: "28%"
  },
  relevanceIndicator: {
    position: 'absolute',
    minWidth: 270,
    top: -10,
    left: '70%',
    transform: [{ translateX: -80 }],
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  relevanceText: {
    color: 'white',
    padding: 2,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    flexWrap: 'nowrap'
  },
  customDropdownWrapper: {
    position: "relative",
    flex: 1,
    marginRight: 10,
    zIndex: 9999,
    elevation: 9999,
  },
});
