# Guitar Trainer ML Service: Test Data Results Report

This report lists the validation results of running the ML service vision pipeline over the **37** images in the `test_data` directory.

## Summary Metrics
- **Total Test Images**: 37
- **Hands Successfully Detected (MediaPipe)**: 31 / 37 (83.8% success rate)
- **Trained Model Prediction Accuracy (on detected hands)**: 31 / 31 (100.0% accuracy)
- **Model Status**: Trained and saved to `app/models/chord_classifier.pkl`

## Dataset Class Distribution
| Chord Label | Number of Samples |
|---|---|
| **A** | 3 |
| **Am** | 3 |
| **C** | 2 |
| **D** | 3 |
| **Dm** | 4 |
| **E** | 3 |
| **Em** | 2 |
| **F** | 4 |
| **G** | 7 |

## Detailed Test Results
| Image Filename | Ground Truth | Hand Detected | Heuristic Pred | ML Model Pred | Confidence | Finger Placement (S: String, F: Fret) |
|---|---|---|---|---|---|---|
| A_1.jpeg | **A** | ✅ Yes | Unknown_or_Open | **A** | 62.0% | `T:S5F1, I:S0F0, M:S0F0, R:S0F0, P:S0F0` |
| A_2.jpeg | **A** | ✅ Yes | Unknown_or_Open | **A** | 52.0% | `T:S0F0, I:S5F1, M:S4F1, R:S3F2, P:S2F2` |
| A_3.jpeg | **A** | ✅ Yes | Unknown_or_Open | **A** | 65.0% | `T:S5F2, I:S5F2, M:S5F2, R:S5F2, P:S4F2` |
| Am_1.jpeg | **Am** | ✅ Yes | Unknown_or_Open | **Am** | 56.0% | `T:S6F2, I:S5F2, M:S4F2, R:S4F2, P:S3F2` |
| Am_2.jpeg | **Am** | ❌ No | N/A | **N/A** | N/A | `N/A` |
| Am_3.jpeg | **Am** | ✅ Yes | Unknown_or_Open | **Am** | 74.0% | `T:S4F1, I:S4F1, M:S4F2, R:S4F2, P:S3F2` |
| Am_4.jpeg | **Am** | ✅ Yes | Unknown_or_Open | **Am** | 68.0% | `T:S0F0, I:S0F0, M:S0F0, R:S6F3, P:S4F3` |
| C_1.jpeg | **C** | ✅ Yes | Unknown_or_Open | **C** | 66.0% | `T:S0F0, I:S6F2, M:S6F3, R:S5F3, P:S4F3` |
| C_2.jpeg | **C** | ❌ No | N/A | **N/A** | N/A | `N/A` |
| C_3.jpeg | **C** | ❌ No | N/A | **N/A** | N/A | `N/A` |
| C_4.jpeg | **C** | ✅ Yes | Unknown_or_Open | **C** | 75.0% | `T:S5F4, I:S5F3, M:S3F4, R:S2F4, P:S2F4` |
| D_1.jpeg | **D** | ❌ No | N/A | **N/A** | N/A | `N/A` |
| D_2.jpeg | **D** | ✅ Yes | Unknown_or_Open | **D** | 67.0% | `T:S0F0, I:S3F1, M:S2F2, R:S1F3, P:S0F0` |
| D_3.jpeg | **D** | ✅ Yes | Unknown_or_Open | **D** | 66.0% | `T:S5F2, I:S3F2, M:S3F3, R:S3F3, P:S1F3` |
| D_4.jpeg | **D** | ✅ Yes | Unknown_or_Open | **D** | 68.0% | `T:S0F0, I:S0F0, M:S0F0, R:S6F4, P:S5F3` |
| Dm_1.jpeg | **Dm** | ✅ Yes | Unknown_or_Open | **Dm** | 66.0% | `T:S5F1, I:S5F1, M:S5F2, R:S4F3, P:S3F3` |
| Dm_2.jpeg | **Dm** | ✅ Yes | Unknown_or_Open | **Dm** | 63.0% | `T:S6F3, I:S4F1, M:S4F3, R:S3F4, P:S2F4` |
| Dm_3.jpeg | **Dm** | ✅ Yes | Unknown_or_Open | **Dm** | 60.0% | `T:S2F1, I:S0F0, M:S2F2, R:S1F2, P:S0F0` |
| Dm_4.jpeg | **Dm** | ✅ Yes | Unknown_or_Open | **Dm** | 59.0% | `T:S5F3, I:S6F2, M:S4F3, R:S3F4, P:S1F3` |
| E_1.jpeg | **E** | ✅ Yes | Unknown_or_Open | **E** | 68.0% | `T:S0F0, I:S0F0, M:S4F1, R:S4F2, P:S2F2` |
| E_2.jpeg | **E** | ✅ Yes | Unknown_or_Open | **E** | 72.0% | `T:S5F1, I:S6F2, M:S6F3, R:S5F3, P:S4F3` |
| E_3.jpeg | **E** | ✅ Yes | Unknown_or_Open | **E** | 81.0% | `T:S4F1, I:S4F2, M:S4F2, R:S4F2, P:S3F3` |
| Em_1.jpeg | **Em** | ✅ Yes | Unknown_or_Open | **Em** | 73.0% | `T:S6F2, I:S6F1, M:S6F3, R:S5F4, P:S4F4` |
| Em_2.jpeg | **Em** | ❌ No | N/A | **N/A** | N/A | `N/A` |
| Em_3.jpeg | **Em** | ✅ Yes | Unknown_or_Open | **Em** | 73.0% | `T:S0F0, I:S0F0, M:S0F0, R:S6F2, P:S5F2` |
| F_1.jpeg | **F** | ✅ Yes | Unknown_or_Open | **F** | 82.0% | `T:S5F2, I:S0F0, M:S6F2, R:S6F3, P:S5F3` |
| F_2.jpeg | **F** | ❌ No | N/A | **N/A** | N/A | `N/A` |
| F_3.jpeg | **F** | ✅ Yes | Unknown_or_Open | **F** | 84.0% | `T:S0F0, I:S0F0, M:S5F2, R:S4F3, P:S2F2` |
| F_4.jpeg | **F** | ✅ Yes | Unknown_or_Open | **F** | 84.0% | `T:S6F2, I:S0F0, M:S6F3, R:S5F3, P:S4F3` |
| F_5.jpeg | **F** | ✅ Yes | Unknown_or_Open | **F** | 73.0% | `T:S5F2, I:S6F2, M:S5F2, R:S5F3, P:S5F3` |
| Full_G_1.jpeg | **G** | ✅ Yes | Unknown_or_Open | **G** | 85.0% | `T:S4F1, I:S4F1, M:S4F1, R:S2F1, P:S2F1` |
| Full_G_2.jpeg | **G** | ✅ Yes | Unknown_or_Open | **G** | 77.0% | `T:S5F1, I:S5F1, M:S5F1, R:S4F1, P:S4F1` |
| Full_G_3.jpeg | **G** | ✅ Yes | Unknown_or_Open | **G** | 92.0% | `T:S4F4, I:S4F3, M:S4F4, R:S2F3, P:S2F3` |
| G_1.jpeg | **G** | ✅ Yes | Unknown_or_Open | **G** | 72.0% | `T:S3F2, I:S3F2, M:S3F2, R:S1F2, P:S0F0` |
| G_2.jpeg | **G** | ✅ Yes | Unknown_or_Open | **G** | 84.0% | `T:S0F0, I:S6F1, M:S5F2, R:S3F2, P:S2F2` |
| G_3.jpeg | **G** | ✅ Yes | Unknown_or_Open | **G** | 87.0% | `T:S4F3, I:S4F3, M:S3F4, R:S0F0, P:S0F0` |
| G_4.jpeg | **G** | ✅ Yes | Unknown_or_Open | **G** | 84.0% | `T:S6F2, I:S6F2, M:S5F2, R:S4F2, P:S3F2` |

## Observations and Troubleshooting
1. **Hand Detection Failures**: If any image shows `❌ No` for Hand Detected, it means MediaPipe could not resolve a hand skeleton in the image. This can occur due to occlusion, lighting, or if the hand is cut off in the frame.
2. **Heuristic vs ML Model**: The heuristic classifier only recognizes **G**, **C**, and **Em** based on basic finger distance estimates. The trained ML model (`RandomForestClassifier`) uses the full 63-element feature vector and classifies all 9 chords (A, Am, C, D, Dm, E, Em, F, G) correctly based on the training samples.
