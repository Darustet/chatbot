import { StyleSheet, ActivityIndicator, FlatList, Text, View, TextInput, TouchableOpacity } from "react-native";
import SelectDropdown from 'react-native-select-dropdown';
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ThesisBox } from "@/components/moduleComps/ThesisBox";
import { Hoverable } from "react-native-web-hover";
import { config } from "../config";
import { DownloadCsv } from "../components/DownloadCsv";

const uniCodes = [
  {"uni": "All", "code": "all"},
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

const API_BASE_URL = config.API_BASE_URL;
// number of theses to fetch per university when a specific university is selected (increased to get more data for relevance filtering)
const RPP = 2;

export default function ThesisList() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchedUni, setSearchedUni] = useState("");
  const [theses, setTheses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
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

        if (searchedUni === "all") {
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

      const matchesTitle = title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAuthor = selectedAuthor === "" || author.toLowerCase().includes(selectedAuthor.toLowerCase());
      const matchesYear = selectedYear === "" || year.includes(selectedYear);

      return matchesTitle && matchesAuthor && matchesYear;
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
          <View style={styles.dropdownContainer}>
            <SelectDropdown
              data={uniCodes.map(uni => uni.uni)}
              onSelect={(selectedItem: string) => {
                const selectedUni = uniCodes.find(uni => uni.uni === selectedItem);
                if (selectedUni) {
                  setSelectedItem([selectedUni.uni, selectedUni.code]);
                  setSearchedUni(selectedUni.code); // Update the searched university code
                }
              }}
              renderButton={() => (
                <View style={styles.uniSelected}>
                  <Text
                    style={[
                      styles.uniSelectorText,
                      !selectedItem && { color: "#999" }
                    ]}
                  >
                    {selectedItem ? selectedItem[0] : "Select University"}
                  </Text>
                </View>
              )}
              renderItem={(item, index, isSelected) => (
                <View style={styles.uniSelector}>
                  <Text style={styles.uniSelectorText}>{item}</Text>
                </View>
              )}
            />
          </View>

          <TextInput
            style={styles.inputField}
            placeholder="Filter by author..."
            placeholderTextColor="#999"
            onChangeText={text => setSelectedAuthor(text)}
          />

          <TextInput
            style={styles.inputField}
            placeholder="Filter by year..."
            placeholderTextColor="#999"
            keyboardType="numeric"
            onChangeText={text => setSelectedYear(text)}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              if (selectedItem) {
                setSearchedUni(selectedItem[1])
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

              // Guard legacy/unscored items that do not include Nokia scoring fields yet.
              const rawNokiaRelevance = item?.thesis?._nokiaRelevance ?? item?._nokiaRelevance;
              const validNokiaLabels = ["NOKIA_COLLABORATION", "AMBIGUOUS", "NO_INDICATION_OF_COLLABORATION"];
              const hasKnownRelevance =
                typeof rawNokiaRelevance === "string" && validNokiaLabels.includes(rawNokiaRelevance);
              const nokiaRelevance = hasKnownRelevance ? rawNokiaRelevance : "NOT_SCORED";

              // Extract the Nokia score
              const nokiaScore = getItemScore(item);
              const scoreDisplay = nokiaScore >= 0 ? nokiaScore : "-";

              // Define relevance indicator color
              let relevanceColor = "#95a5a6"; // Gray for not scored / unknown
              if (nokiaRelevance === "NOKIA_COLLABORATION") {
                relevanceColor = "#2ecc71"; // Green for high
              } else if (nokiaRelevance === "AMBIGUOUS") {
                relevanceColor = "#f39c12"; // Orange for medium
              } else if (nokiaRelevance === "NO_INDICATION_OF_COLLABORATION") {
                relevanceColor = "#e74c3c"; // Red for low
              }

              return (
                <Link
                  href={{
                    pathname: "/modules/SingleThesis",
                    params: {
                      handle: getValidHandle(item),
                      thesisId,
                      title,
                      author,
                      year,
                      publisher,
                      universityCode
                    }
                  }}
                >
                  <View style={styles.thesisCardWrapper}>
                    {/* Add Nokia relevance indicator */}
                    <View style={[styles.relevanceIndicator, { backgroundColor: relevanceColor }]}>
                      <Text style={styles.relevanceText}>
                          {nokiaRelevance}
                      </Text>
                    </View>

                    <ThesisBox
                      title={title}
                      author={author}
                      year={year}
                      publisher={publisher}
                    />
                    <Hoverable style={styles.singleThesis}>
                      {({ hovered }) => (
                        hovered && (
                          <View style={styles.hovered}>
                            <Text style={styles.hoveredText}>Click to view</Text>
                          </View>
                        )
                      )}
                    </Hoverable>
                  </View>
                </Link>
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
    shadowRadius: 5
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
    alignItems: "center",
    marginBottom: 20
  },
  dropdownContainer: {
    flex: 1,
    marginRight: 10
  },
  uniSelected: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff"
  },
  uniSelectorText: {
    fontSize: 16,

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
    maxWidth: "30%"
  },
  relevanceIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 2
  },
  relevanceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
});