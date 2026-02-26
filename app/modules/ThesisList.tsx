import { StyleSheet, ActivityIndicator, FlatList, Text, View, TextInput, TouchableOpacity } from "react-native";
import SelectDropdown from 'react-native-select-dropdown';
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ThesisBox } from "@/components/moduleComps/ThesisBox";
import { Hoverable } from "react-native-web-hover";
import { config } from "../config";

const uniCodes = [
  {"uni": "All", "code": "all"},
  {"uni": "Centria", "code": "10024%2F1900"},
  {"uni": "Diakonia", "code": "10024%2F1552"},
  {"uni": "Haaga-Helia", "code": "10024%2F431"},
  {"uni": "Hämeen", "code": "10024%2F1766"},
  {"uni": "Humanistinen", "code": "10024%2F2050"},
  {"uni": "Jyväskylä", "code": "10024%2F5"},
  {"uni": "Kaakkois-suomen", "code": "10024%2F12136"},
  {"uni": "Kajaani", "code": "10024%2F1967"},
  {"uni": "Karelia", "code": "10024%2F1620"},
  {"uni": "Kymenlaakson", "code": "10024%2F1493"},
  {"uni": "Lab", "code": "10024%2F266372"},
  {"uni": "Lahden", "code":"10024%2F10"},
  {"uni": "Lapin", "code": "10024%2F69720"},
  {"uni": "Laurea", "code": "10024%2F12"},
  {"uni": "Metropolia", "code": "10024%2F6"},
  {"uni": "Mikkelin", "code": "10024%2F2074"},
  {"uni": "Oulu", "code": "10024%2F2124"},
  {"uni": "Poliisi", "code": "10024%2F86551"},
  {"uni": "Saimaan", "code": "10024%2F1567"},
  {"uni": "Satakunnan", "code": "10024%2F14"},
  {"uni": "Savonia", "code": "10024%2F1476"},
  {"uni": "Seinäjoen", "code": "10024%2F1"},
  {"uni": "Tampere", "code": "10024%2F13"},
  {"uni": "Turun", "code": "10024%2F15"},
  {"uni":  "Vaasa", "code": "10024%2F1660"},
  {"uni": "Yrkeshögskolan Arcada", "code": "10024%2F4"},
  {"uni":  "Yrkeshögskolan Novia", "code": "10024%2F2188"},
  {"uni": "Aalto", "code": "AALTO"},
];

const API_BASE_URL = config.API_BASE_URL;
// number of theses to fetch per university when a specific university is selected (increased to get more data for relevance filtering)
const RPP = 10; 
const linkStart = "discover?scope=";
const linkEnd = "&query=+nokia&rpp=100";

export default function ThesisList() {
  const [selectedItem, setSelectedItem] = useState<any>([uniCodes[0].uni, uniCodes[0].code]);
  const [searchedUni, setSearchedUni] = useState<any>(uniCodes[0].code);
  const [theses, setTheses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add this utility function to format handles correctly
  const getValidHandle = (item: any) => {
    const handle = item.handle || "";
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
    const fetchTheses = async () => {
      setError(null);
      setLoading(true);
      
      try {
        console.log("Fetching Nokia-related thesis data from theseus.fi via server...");
        
        let fetchedData = [];
        
        if (searchedUni === "all") {
          // When "All" is selected, fetch from multiple major universities
          setLoading(true);
          
          // Select a few major universities to get a diverse set of theses
          const majorUniCodes = [
            "10024%2F6",    // Metropolia
            "10024%2F431",  // Haaga-Helia
            "10024%2F2124", // Oulu
            "10024%2F13",   // Tampere
            "10024%2F15",   // Turku
            "10024%2F14",   // Satakunnan
            "10024%2F13",   // Tampere
            "10024%2F12"    // Laurea
          ];
          
          // Fetch from each university with increased results per page
          const allPromises = majorUniCodes.map(async (uniCode) => {
            try {
              const uniResponse = await fetch(`${API_BASE_URL}/uni/${uniCode}?query=nokia&rpp=10`);
              if (uniResponse.ok) {
                const uniData = await uniResponse.json();
                
                // Add university information to theses that are missing it
                const uniInfo = uniCodes.find(u => u.code === uniCode);
                //  
                const enhancedUniData = uniData.map(thesis => ({
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
            fetchedData = fetchedData.map(thesis => ({
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
        
        // Update state with combined data
        setTheses(fetchedData);
        
        // Apply enhanced Nokia relevance filtering
        if (fetchedData.length > 0) {
          console.log("Applying enhanced Nokia relevance filtering...");
          
          const enhancedData = fetchedData.map(thesis => {
            // Extract relevant text fields for analysis
            const title = (thesis?.thesis?.title || thesis?.title || "").toLowerCase();
            const description = (thesis?.thesis?.description || thesis?.description || "").toLowerCase();
            const abstract = (thesis?.thesis?.abstract || thesis?.abstract || "").toLowerCase();
            const subject = (thesis?.thesis?.subject || thesis?.subject || "").toLowerCase();
            
            // Calculate Nokia relevance score
            let nokiaScore = 0;
            
            // Title is most important (5 points)
            if (title.includes("nokia")) {
              nokiaScore += 5;
            }
            
            // Abstract/description is very relevant (3 points)
            if (abstract.includes("nokia") || description.includes("nokia")) {
              nokiaScore += 3;
            }
            
            // Subject/keywords are somewhat relevant (2 points)
            if (subject.includes("nokia")) {
              nokiaScore += 2;
            }
            
            // Check for highly relevant phrases (additional 3 points)
            const relevantPhrases = [
              "collaboration with nokia",
              "nokia project",
              "nokia case study",
              "nokia corporation",
              "nokia technologies"
            ];
            
            relevantPhrases.forEach(phrase => {
              if (title.includes(phrase) || abstract.includes(phrase) || description.includes(phrase)) {
                nokiaScore += 3;
              }
            });
            
            // Determine confidence level
            let nokiaRelevance = "low";
            if (nokiaScore >= 8) {
              nokiaRelevance = "high";
            } else if (nokiaScore >= 3) {
              nokiaRelevance = "medium";
            }
            
            return {
              ...thesis,
              _nokiaScore: nokiaScore,
              _nokiaRelevance: nokiaRelevance
            };
          });
          
          // Sort by Nokia relevance score (highest first)
          enhancedData.sort((a, b) => (b._nokiaScore || 0) - (a._nokiaScore || 0));
          
          // Update state with enhanced data
          setTheses(enhancedData);
        }
      } catch (error) {
        console.error("Error fetching Nokia thesis data:", error);
        setError(error.message || "Failed to load Nokia-related theses.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTheses();
  }, [searchedUni]);
  
  // Simplify the filtering to handle any data structure
  const filteredTheses = theses.filter(thesis => {
    // Support both the nested and direct structures
    const title = thesis.title || thesis.thesis?.title || "";
    const author = thesis.author || thesis.thesis?.author || "";
    const year = thesis.year || thesis.thesis?.year || thesis.date || thesis.thesis?.date || "";
    
    const matchesTitle = title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAuthor = selectedAuthor === "" || author.toLowerCase().includes(selectedAuthor.toLowerCase());
    const matchesYear = selectedYear === "" || year.includes(selectedYear);
    
    return matchesTitle && matchesAuthor && matchesYear;
  });

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
                  <Text style={styles.uniSelectorText}>{selectedItem[0] || "Select University"}</Text>
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
        
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={() => setSearchedUni(selectedItem[1])}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
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
        <FlatList
          data={filteredTheses}
          numColumns={3}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }: { item: any }) => {
            console.log("Rendering thesis item:", item);
            
            // Enhanced string extraction with improved fallbacks
            const title = String(item?.thesis?.title || item?.title || "Untitled Thesis");
            const author = String(item?.thesis?.author || item?.author || "Unknown Author");
            const year = String(item?.thesis?.year || item?.year || item?.thesis?.date || item?.date || "Unknown Date");
            const universityCode = String(item?.thesis?.universityCode || item?.universityCode || "unknown university code");
            const thesisId = String(item?.thesis?.thesisId || item?.thesisId || `unknown-id`);
            
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
            
            // Debug log showing where we got the university name from
            console.log(`University for "${title}": ${publisher} (Source: ${universitySource})`);
            
            // Get Nokia relevance information
            const nokiaRelevance = item._nokiaRelevance || "low";
            
            // Define relevance indicator color
            let relevanceColor = "#e74c3c"; // Red for low
            if (nokiaRelevance === "high") {
              relevanceColor = "#2ecc71"; // Green for high
            } else if (nokiaRelevance === "medium") {
              relevanceColor = "#f39c12"; // Orange for medium
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
                    universityCode,
                  }
                }}
              >
                <View style={styles.thesisCardWrapper}>
                  {/* Add Nokia relevance indicator */}
                  <View style={[styles.relevanceIndicator, { backgroundColor: relevanceColor }]}>
                    <Text style={styles.relevanceText}>
                      {nokiaRelevance === "high" ? "Nokia Project" : 
                       nokiaRelevance === "medium" ? "Likely Nokia" : "Mentions Nokia"}
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
      )}
    </View>
  );
}

export const countMetropoliaNokiaTheses = async () => {
  try {
    const response = await fetch("http://localhost:3000/uni/10024%2F6?query=nokia&rpp=100");
    if (!response.ok) {
      throw new Error(`Failed to fetch theses: ${response.status}`);
    }

    const data = await response.json();

    // Filter theses based on Nokia relevance
    const relevantTheses = data.filter((thesis: any) => {
      const title = (thesis?.title || "").toLowerCase();
      const description = (thesis?.description || "").toLowerCase();
      const abstract = (thesis?.abstract || "").toLowerCase();

      let nokiaScore = 0;

      // Calculate Nokia relevance score
      if (title.includes("nokia")) nokiaScore += 5;
      if (description.includes("nokia") || abstract.includes("nokia")) nokiaScore += 3;

      const relevantPhrases = [
        "collaboration with nokia",
        "nokia project",
        "nokia case study",
        "nokia corporation",
        "nokia technologies",
      ];

      relevantPhrases.forEach((phrase) => {
        if (title.includes(phrase) || description.includes(phrase) || abstract.includes(phrase)) {
          nokiaScore += 3;
        }
      });

      const relevance = nokiaScore >= 8 ? "high" : nokiaScore >= 3 ? "medium" : "low";
      return relevance === "high" || relevance === "medium";
    });

    return relevantTheses.length;
  } catch (error) {
    console.error("Error counting Metropolia Nokia theses:", error);
    return 0; // Return 0 in case of an error
  }
};

export const countMetropoliaRelevantTheses = async () => {
  try {
    const response = await fetch("http://localhost:3000/uni/10024%2F6?query=nokia&rpp=100");
    if (!response.ok) {
      throw new Error(`Failed to fetch theses: ${response.status}`);
    }

    const data = await response.json();

    // Filter theses based on Nokia relevance
    const relevantTheses = data.filter((thesis: any) => {
      const title = (thesis?.title || "").toLowerCase();
      const description = (thesis?.description || "").toLowerCase();
      const abstract = (thesis?.abstract || "").toLowerCase();

      let nokiaScore = 0;

      // Calculate Nokia relevance score
      if (title.includes("nokia")) nokiaScore += 5;
      if (description.includes("nokia") || abstract.includes("nokia")) nokiaScore += 3;

      const relevantPhrases = [
        "collaboration with nokia",
        "nokia project",
        "nokia case study",
        "nokia corporation",
        "nokia technologies",
      ];

      relevantPhrases.forEach((phrase) => {
        if (title.includes(phrase) || description.includes(phrase) || abstract.includes(phrase)) {
          nokiaScore += 3;
        }
      });

      const relevance = nokiaScore >= 8 ? "high" : nokiaScore >= 3 ? "medium" : "low";
      return relevance === "high" || relevance === "medium";
    });

    return relevantTheses.length;
  } catch (error) {
    console.error("Error counting relevant Metropolia theses:", error);
    return 0; // Return 0 in case of an error
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  searchBar: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dropdownContainer: {
    flex: 1,
    marginRight: 10,
  },
  uniSelected: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
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
    marginVertical: 2,
  },
  inputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    marginLeft: 10,
  },
  searchButton: {
    alignSelf: "center",
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  singleThesis: {
    margin: 10,
    flex: 1,
    maxWidth: "30%",
  },
  hovered: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 10,
  },
  hoveredText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
    maxWidth: "30%",
  },
  relevanceIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 2,
  },
  relevanceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});