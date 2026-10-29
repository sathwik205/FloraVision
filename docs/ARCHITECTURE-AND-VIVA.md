# FloraVision
## Architecture, research paper and viva guide
Version 1.1 | 29 October 2026 | Read alongside the separate training notebook and website source

## 1. Your project in one minute
FloraVision is a crop leaf screening web application. A user selects a crop and captures or uploads a leaf photo. The server validates the image, prepares a 128 x 128 RGB tensor, runs that crop's compact convolutional neural network, and maps the predicted class to an educational advisory record. The website displays the class scores, symptoms and next steps, and optionally saves result metadata in a local journal.

Training happens separately in Google Colab using TensorFlow/Keras. The deployed website uses Next.js, React, TypeScript, custom CSS and a Node.js API. The compact trained network is exported to JSON and reconstructed with TensorFlow.js on the server. The visitor's phone supplies the camera and interface; the server performs classification.

Use this explanation after you have actually run and tested your models. Until then, say the software is prepared and model training or validation is pending. An example result in the demo is an interface demonstration, not an image diagnosis.

## 2. What you received and what still needs your run
The website ZIP includes the interface, API, model loader, advisory catalog, camera flow and tests. The separate notebook includes dataset acquisition, splitting, training, checkpoint recovery, evaluation, charts and export. The separate command document mirrors its cells. Neither deliverable contains pretrained disease weights.

The uploaded paper is a proposed system report, not a completed experimental study. It explicitly withholds FloraVision accuracy, speed and edge-device claims. The current source was checked with TypeScript and 13 backend tests. Colab training, a production build, actual browser/camera behavior and device benchmarking still need verification. Read the verification file for the environment limitations.

## 3. Complete architecture
The architecture has two connected workflows. Training is an offline development task; prediction is an online request made by a visitor.

Training: official PlantVillage repository or a verified local copy -> provenance and leaf-group map -> validated images -> locked train/validation/test manifest -> crop-specific Keras model -> best weights and metadata -> test report and plots -> JSON export -> website models folder.

Prediction: phone/laptop browser -> photo capture or file picker -> preview and optional compression -> multipart POST /api/predict -> request and content validation -> RGB decode and bilinear resize -> cached crop model -> ordered score vector -> stable disease ID -> advisory lookup -> JSON result -> result cards and optional local journal.

The model metadata connects the workflows. It specifies the crop, ordered labels, 128 x 128 input size, preprocessing identifier, architecture, version, artifact hash and split-manifest hash. These values are checked rather than guessed.

### Responsibility boundaries
- Browser: crop selection, camera permission, image preview, input feedback, upload, result display, theme and local history.
- API controller: request validation, coordination, status codes and response formatting.
- Image module: byte limits, supported formats, EXIF orientation, RGB conversion, resize and normalization.
- Inference module: trusted model selection, model cache, prediction and tensor disposal.
- Model engine: layer reconstruction, shape/config checks, label mapping and reference-output checks.
- Advisory catalog: symptoms, general prevention, next steps, review status and source text, maintained independently of weights.
- Training notebook: reproducible data preparation, learning, checkpointing, measurement and export.

There is no database or login service in this version. Google Drive stores training artifacts. Browser localStorage stores up to 100 explicitly saved result records. Photo bytes are not stored in the journal or intentionally persisted by the API.

## 4. Understand the dataset
The official PlantVillage repository describes 54,306 images spanning 14 crop species and 26 diseases. These describe the broader source dataset, not the number your experiment necessarily uses. FloraVision selects six crops with 27 crop-condition categories. Several are healthy classes; tomato also includes a pest-damage category. Do not call all 27 categories diseases.

| Crop | Output classes |
|---|---:|
| Potato | 3 |
| Bell pepper | 2 |
| Corn | 4 |
| Grape | 4 |
| Apple | 4 |
| Tomato | 10 |

A crop-specific network predicts only that crop's classes. For potato the ordered labels are Early blight, Late blight and healthy. The user must choose the correct crop. Choosing a crop is not automatic crop recognition.

### What the notebook records
The Git commit, source location, leaf-map checksum, selected crops, seed, training settings and per-image SHA-256 hashes are retained. Each manifest row records a relative path, crop, label, group and split. Excluded files are recorded with a reason. A restarted run verifies image hashes before continuing.

Images of the same known leaf stay in one partition. The notebook uses the upstream leaf-map where available. Because this map lacks several selected classes, unmapped or ambiguous files use normalized source-filename groups by default; the manifest marks these as filename_fallback, not verified leaf identities. Strict mapped-only mode is optional but can leave entire classes empty. The Apple_Frogeye Spot annotation is mapped to the Apple___Black_rot folder category. Exact byte duplicates are removed. Matching decoded RGB content joins groups to prevent that duplicate content crossing splits. It then assigns approximately 70% of groups to training, 15% to validation and 15% to testing within each class. The image percentages can differ because groups have different sizes.

Filename-derived groups can still split differently named photographs of the same unknown leaf. Group-disjointness checks guarantee separation of recorded group IDs, not perfect biological subject independence. Report known-map and fallback coverage separately.

Do not quote a final image count before reading your manifest. Selected crops, duplicate removal, invalid files and optional strict group filtering change it. This split is our experiment's split; it is not the upstream predefined 80/20 split. Confirm source license/usage terms and cite the dataset authors in your final submission.

### Why split before augmentation?
If you augment an image and then randomly divide its variants, near-identical views can enter both training and testing. That measures memorization too generously. Here augmentation operates only during model training on the training partition. Validation and test preprocessing are deterministic.

Controlled-background photographs may differ strongly from field photographs. Lighting, clutter, leaf age, camera processing, occlusion, multiple leaves and unseen conditions create distribution shift. A separate external field-image evaluation is necessary before claiming practical reliability.

## 5. CNN architecture you should be able to draw
Input tensors contain 128 x 128 pixels with three RGB channels, normalized to [0,1]. The batch dimension is separate. Training-only augmentation consists of horizontal flip, rotation factor 0.08 and zoom factor 0.1. Rotation 0.08 corresponds to a fraction of a full turn, about 28.8 degrees, not 0.08 degrees.

| Stage | Operation | Output per image |
|---|---|---|
| Input | RGB float32 | 128 x 128 x 3 |
| 1 | 3x3 separable convolution, 24 channels, ReLU; 2x2 max pool | 64 x 64 x 24 |
| 2 | 3x3 separable convolution, 48 channels, ReLU; 2x2 max pool | 32 x 32 x 48 |
| 3 | 3x3 separable convolution, 96 channels, ReLU; 2x2 max pool | 16 x 16 x 96 |
| 4 | 3x3 separable convolution, 128 channels, ReLU; 2x2 max pool | 8 x 8 x 128 |
| Aggregation | Global average pooling | 128 |
| Regularization | Dropout 0.25, training only | 128 |
| Classifier | Dense softmax | K scores |

Separable convolution first filters each input channel spatially, then combines channels with a 1x1 pointwise convolution. For kernel width d, M input channels and N output channels, a standard convolution has d*d*M*N kernel weights. A depthwise-separable convolution with depth multiplier 1 has d*d*M + M*N kernel weights, before biases. Fewer weights can reduce storage and arithmetic, but runtime efficiency must still be measured on actual hardware.

For this exact architecture, the four convolution stages contain 19,955 parameters including bias, and the output head adds 129*K. Calculated totals are 20,213 for pepper, 20,342 for potato, 20,471 for each four-class crop and 21,245 for tomato. Confirm these against model.summary() and metadata from the executed notebook. These are architecture calculations, not measured speed, memory or accuracy.

Global average pooling averages each of 128 spatial feature maps into one feature. Flattening the 8 x 8 x 128 tensor would instead produce 8,192 features. Dropout randomly suppresses a fraction of features during training and is disabled during inference. ReLU returns max(0,x), introducing nonlinearity.

This compact model is trained from scratch. The delivered standalone notebook does not train a MobileNet baseline, compare multiple architectures, use transfer learning or implement quantization. Those would be new experiments.

## 6. How learning works
The model predicts a score vector. Sparse categorical cross-entropy computes -log(p_true) for the correct class, and Adam updates weights using gradients from backpropagation. Sparse means the labels are integer class indices, rather than one-hot vectors. Softmax transforms logits into nonnegative scores summing to one. The largest score determines the displayed label.

An epoch is a pass through the training partition. A batch is the subset used for one optimization step. With N training images and batch size B, there are ceil(N/B) training batches per epoch. The default batch size is 16, learning rate 0.001 and maximum epoch count 30. Training may finish earlier after five consecutive validation-loss non-improvements.

Training loss changes through weight updates. Validation loss is measured without learning on held-out data. Test data is kept out of training decisions and used for final reporting. Selecting a new model because it did better on the test set would turn that set into another validation set.

At each epoch the notebook stores a complete Keras checkpoint and progress state in Drive. Best and latest checkpoints are retained. An interrupted run resumes from its last fully recorded epoch; a completed crop is reused after hash checks. The random sample/augmentation sequence across restarts may differ from an uninterrupted run, even with the same initial seed. A seed helps reproducibility; it is not a guarantee of identical behavior across frameworks and hardware.

## 7. Exact preprocessing and conversion contract
The training pipeline decodes JPEG/PNG/WebP, rejects invalid dimensions, applies EXIF orientation, converts to RGB, resizes with Pillow bilinear sampling to 128 x 128 and divides float32 pixel values by 255. The API uses Sharp to decode, followed by a custom implementation of the Pillow RGB bilinear resizing algorithm. Its enlargement and reduction fixtures match Pillow pixel-for-pixel.

That does not prove all JPEG decoders, profiles, transparency or camera processing are identical. Real-image parity testing and external evaluation remain necessary. Client compression of large photos and JPEG camera capture can also change pixel values.

The exporter loads the best .keras file and verifies its checksum against metadata. It serializes supported convolution, pooling, global-average-pooling and dense layers with their weights, preserving label order. Augmentation and dropout are omitted because they are inactive during inference. Constant-input reference outputs for 0, 0.5 and 1 are embedded in the package.

The Node loader validates the crop, label set, architecture, tensor shapes and supported configuration, then reconstructs the model and checks reference scores with an absolute tolerance of 0.001. The notebook additionally exports three actual training-image tensors per crop for the separate models:parity command. Passing these is evidence of numerical integration for those fixtures; it is not proof of accuracy or exhaustive conversion equivalence.

The exported filename ends in -browser.json for compatibility with the existing format. In this delivered project the network executes on the server. The .keras artifact hash identifies the original Keras file; it is not a checksum of the exported JSON bytes or a cryptographic signature proving trusted model authorship.

## 8. API, camera and mobile behavior
GET / serves the website. GET /api/health reports server health. GET /api/crops lists supported labels and installed-file status. GET /api/demo returns a labeled illustrative result. POST /api/predict receives multipart fields crop and image and returns the assessment or a structured error. Installed-file status checks existence and size; full model validation occurs during model loading or the check command.

Prediction flow: validate origin where supplied; enforce the request byte cap; validate crop; require image bytes; enforce the image cap; decode actual contents; prepare pixels; select/load the model; validate output scores; choose argmax; map its index through the model's own labels; look up advice; return JSON. Changing alphabetical sorting without changing model metadata would silently corrupt labels.

The API limits image bytes to 4,000,000 and the full multipart request to 4,250,000. It rejects unsupported formats, images smaller than 32 pixels per side and images larger than 20 megapixels. The browser accepts source photos up to 20 MB and compresses files over 4 MB. Actual image decoding is server-validated; a filename extension is not sufficient evidence of image content.

A first inference loads and validates a crop model. Subsequent requests can reuse the cached model within that server instance. Serverless instances may restart, so a cache does not guarantee every request is warm. Input/output tensors are disposed after prediction to avoid memory accumulation. A 60-second route duration is configured; actual platform behavior and CPU cost still require deployment tests.

The live camera uses getUserMedia, requests a rear-facing camera when possible, previews video and captures JPEG through a canvas. It stops tracks when closed or unmounted and handles late permission resolution. HTTPS or localhost and user permission are required. The photo-picker fallback uses capture=environment as a hint; the operating system chooses the exact interface. HEIC file uploads are not supported; use camera capture or JPEG export.

Responsive CSS changes layout at narrow widths, offers a mobile navigation bar/drawer and respects reduced-motion preferences. This is implementation support, not evidence that every phone has been tested. Check Android Chrome and iPhone Safari on actual devices, including denied permission, rotated screens and keyboard use.

The journal stores only chosen assessment records locally, up to 100. It is not a cloud account. Clearing browser data loses it; use download first. The API does not intentionally save uploaded photos. Public deployment still needs operational monitoring, request-rate controls and a privacy review appropriate to its actual use.

## 9. Results and graphs: what to report
Accuracy is the fraction of correct test predictions. Precision for a class is TP/(TP+FP), recall is TP/(TP+FN), and F1 is 2*precision*recall/(precision+recall). Macro averages give each class equal weight; this is useful when common classes dominate overall accuracy. Zero denominators are handled as zero in this notebook.

The confusion matrix has actual classes on rows and predicted classes on columns. Diagonal cells are correct predictions. Large off-diagonal cells show which conditions are confused. Learning curves plot training and validation loss/accuracy against epochs. Training improvement with deteriorating validation results suggests overfitting; poor performance on both suggests underfitting, data issues or insufficient learning.

Report the source revision, included/excluded counts, grouping method, train/val/test counts per class, seed, epochs, batch size, model parameters, chosen checkpoint, model hash and metrics. Include all supported crops you actually trained. Do not imply a ready UI crop card proves its model exists.

The notebook's timing is synchronized Keras execution per batch on Colab; the first batch and warmed-batch median/p95 are distinct. Those numbers exclude decoding/network and do not represent the website's individual-request latency. The API duration field measures part of server request handling. For website latency, measure the complete browser request separately and name the CPU/server region, model version, photo size and number of trials. Offline edge and energy claims need a real edge device and a separate measurement protocol.

The earlier conversation showed 87% validation accuracy after a five-epoch potato run. That was a historical validation log, not a current locked-test result, a six-crop result or a field result. Use the JSON reports from the new notebook for new claims.

## 10. Read your uploaded paper accurately
The six-page document is titled "Lightweight and Robust Deep Learning for Real-Time Plant Disease Detection on Edge Devices" and describes itself as a college capstone comparative engineering analysis. Its abstract and conclusion explicitly frame FloraVision as a proposed application and implementation plan. It does not report a completed FloraVision experiment.

### Page-by-page study map
- Page 1: abstract, motivation, aims and crop-specific classification. Explain why prediction alone is less useful than a traceable advisory response and why literature accuracy cannot be reused as your accuracy.
- Page 2: proposed request flow, component responsibilities, technology stack and code organization. Know which responsibilities remain the same even though the implementation framework changed.
- Page 3: dataset labels, compact CNN proposal, argmax equation, preprocessing contract, model packaging and API/advisory integration. Be able to explain class order with a three-element potato vector.
- Page 4: advisory boundaries, response schema, mobile UI, failure recovery and versioned model registry. Explain why guidance text can change independently of training.
- Page 5: upload safety, privacy, server versus edge operation, usage examples and evaluation plan. Explain why a phone browser does not establish phone inference.
- Page 6: acceptance checks, interface/data verification, scientific boundaries, roadmap and references. Know which checks you have actually passed and show the evidence.

### Paper-to-implementation comparison
| Topic | Uploaded proposal | Delivered implementation |
|---|---|---|
| Backend | Flask/Python | Next.js route handlers / Node.js |
| Frontend | HTML/JavaScript + Tailwind | React/TypeScript + custom CSS |
| Training | TensorFlow/Keras plan | Separate Colab Keras notebook |
| Serving model | Server loads .keras | Server reconstructs exported compact model using TensorFlow.js |
| Routes | /, /crops, /samples, /predict | /, /api/crops, /api/demo, /api/predict, /api/health |
| Model design | Four-stage compact candidate; pretrained comparison proposed | Four separable-convolution stages; no baseline comparison executed |
| Subject grouping | Group by leaf where known | Leaf-map groups where known; explicitly reported filename fallback elsewhere |
| Advisory | Reviewed guidance planned | Educational draft; agronomist review outstanding |
| Edge and real-time | Design goals requiring evidence | Server inference; no offline/edge or latency claim established |

Explain the stack change as an implementation decision supporting the requested Next.js/Vercel website. The conceptual separation of UI, validation, inference, metadata and advice is retained. Update the final report's implementation section to the actual stack, or keep the document clearly labeled as the earlier proposal. Do not say Flask or Tailwind is used in this ZIP.

### Literature claims and contribution
The paper attributes 99.35% to Mohanty et al., 99.53% to Ferentinos and 99.75% to Too et al. Those are figures quoted by the supplied paper from different studies and protocols; they have not been re-established by this project or independently re-audited here. Consult the original studies before using those numbers in a formal comparison. Different datasets, splits and test conditions prevent a simple ranking.

The defensible contribution here is engineering integration: crop-specific classification tied to stable metadata, a validated upload API and readable guidance. Using a CNN alone is not a novel research algorithm. A claim of a new method or superior robustness would need controlled comparisons, ablations, statistical evidence and external data.

## 11. Likely viva questions and answer points
### Problem and contribution
1. What problem are you solving? Preliminary screening of supported leaf conditions from photographs, with understandable guidance and traceable results.
2. Who uses it? A student, grower or field worker who can select a supported crop and photograph a leaf; deployment suitability depends on validation.
3. Why six crops? They have known PlantVillage categories and a manageable initial model registry. They are a chosen scope, not all crops.
4. What is your contribution? The implemented training-to-API-to-advice workflow and tests; do not claim a new learning algorithm without evidence.
5. Is this a confirmed diagnosis? No. It is an image classifier limited to its learned categories and input distribution.

### Data and evaluation
6. Where did data come from? The recorded PlantVillage Git repository revision, using raw color images for the selected classes.
7. How many images did you use? Read the included records and per-class split counts in your saved manifest; do not repeat the full repository total as your subset size.
8. Why three splits? Training learns weights, validation guides stopping/settings, and testing estimates performance after selection.
9. What is leakage? Information about test examples reaching training/model selection, including different photographs of the same leaf across splits.
10. How do you reduce leakage? Known leaf groups stay together, exact duplicates are removed and matching RGB images join groups. Unmapped images have filename fallback groups; this does not establish full subject separation and must be reported.
11. Why might field accuracy drop? Natural backgrounds and capture conditions differ from controlled data, and the field may contain unseen conditions.
12. Why use macro-F1? It weights classes equally and helps reveal poor minority-class performance hidden by overall accuracy.
13. What does the confusion matrix show? Counts of actual-versus-predicted classes, including the specific pairs the model confuses.
14. Can you tune on the test set? Doing so invalidates its role as an untouched final evaluation set.
15. What is your achieved accuracy? State the measured crop-specific locked-test result, sample count and model version. If not evaluated, say it is pending.

### Model
16. Why a CNN? Convolutions learn spatial patterns in images while sharing weights across positions.
17. What makes this network compact? Separable convolutions, modest channel widths and global average pooling limit its parameter count.
18. What is depthwise separable convolution? Per-channel spatial filtering followed by a pointwise operation mixing channels.
19. Why 128 x 128? It limits compute and defines a fixed contract; its accuracy/efficiency tradeoff has not been proven optimal.
20. What is ReLU? The activation max(0,x), which permits nonlinear feature combinations.
21. What does max pooling do? Downsamples feature maps by keeping local maxima, reducing spatial dimensions.
22. Why global average pooling? It summarizes each feature map with one value and avoids a large flattened dense input.
23. What is dropout? Training-time random suppression of features; it is disabled for inference.
24. Which optimizer and loss? Adam with learning rate 0.001 and sparse categorical cross-entropy.
25. What is an epoch versus a batch? An epoch covers the training partition; a batch is one subset used for a gradient update.
26. What does early stopping monitor? Validation loss, with five consecutive non-improving epochs; the best saved checkpoint is exported.
27. Did you use transfer learning? Not in the delivered standalone compact-model notebook. The proposal's pretrained comparison is future work.
28. Is a score of 0.95 a 95% chance of correct diagnosis? No. It is a softmax class score and has not been calibrated as a correctness probability.
29. How do you detect a wrong crop or a non-leaf? There is no validated detector for these cases; the classifier can still produce confident scores.
30. Why separate crop models? A smaller crop-specific label space and independent replacement. Greater accuracy is not guaranteed by this architecture alone.

### Software and deployment
31. Where does inference run? In the Node.js backend using TensorFlow.js CPU; Colab handles model training.
32. Why export Keras weights? The website runtime does not directly execute the Python .keras training environment. The exporter provides the supported architecture, weights and metadata.
33. How do you verify conversion? Constant reference predictions on load and separate real-image tensor comparisons, plus matching labels and preprocessing.
34. Why does label ordering matter? Output index i only means the label stored at metadata.labels[i]; rearranging labels can display the wrong disease.
35. How are results connected to advice? The stable crop-condition identifier is the lookup key; the text is separate from learned weights.
36. How is an invalid upload handled? The server checks size, crop, actual decodability, format and dimensions and returns a structured error.
37. What happens without a trained model? The real scan is unavailable and the API returns a model error. The labeled demo remains separate.
38. Why cache models? It reduces repeated loading within a live server instance; it does not eliminate cold starts across new instances.
39. Why must camera access use HTTPS? Browsers restrict live camera APIs to secure contexts and require permission.
40. Where are saved scans stored? This browser's localStorage, without image bytes; no cloud account/database is implemented.
41. Does a working phone UI mean edge AI? No. The request still reaches a server. Offline edge AI requires on-device execution and device tests.
42. Why does the paper say Flask? It describes the earlier proposal. The delivered version changed the backend to Next.js for the chosen deployment workflow.
43. Why not claim every phone works? Browser versions, permissions, camera APIs and formats differ. Name the devices/browsers actually tested.
44. What do software tests prove? That known inputs and outputs meet contracts; they do not establish biological accuracy.
45. What would you improve next? External field validation, reviewed advice, a pretrained baseline, score calibration, unknown-input rejection, monitoring/rate limits and actual edge benchmarks.

## 12. What to learn before your demonstration
First, trace one potato image through every layer and file. Know where its selected crop becomes an API field, how pixels are normalized, how the model is selected, and how an output index becomes advice. Second, learn the model diagram and definitions in Sections 5-6. Third, explain train/validation/test and leaf grouping without reading notes. Fourth, open your real metrics and identify one confused class pair. Fifth, practice explaining the difference between the proposal and implementation.

A practical study order is: architecture and live scan flow; dataset and leakage; CNN/loss/optimizer; evaluation graphs; paper comparison; limitations and next experiments. Practice the one-minute introduction and answers to questions 7, 10, 15, 28, 31, 34, 41 and 42. Those expose common misunderstandings.

## 13. Demonstration checklist and evidence sheet
Before presenting, run npm run typecheck, npm test, npm run models:check and a local production build. Install your actual exported model files and run the real-image parity checker. Test the phone over HTTPS, including camera permission granted and denied.

Show one successful real scan and its selected crop/model version. Then show invalid input handling or an unavailable model. Explain the score distribution and the advisory's educational review status. Save a result, reload the journal and download its JSON. Show the locked-test report and confusion matrix separately from the interface demo.

Fill these fields from actual artifacts, never from example values:
- Dataset source and commit; license/usage evidence.
- Crop/class names and included/excluded image counts.
- Training, validation and test counts per class; unique group counts.
- Seed, epochs completed, batch size, learning rate, best validation loss.
- Model version, parameter count, model hash and manifest hash.
- Test accuracy, macro precision/recall/F1 and confusion matrix.
- External-image evaluation status and sampling protocol.
- Phone/browser versions tested and camera permission behavior.
- Deployment hardware/runtime, cold/warm measurements and timing scope.

Do not relabel other researchers' results as yours, call a fixed demo a prediction, describe educational advice as expert-reviewed, or call server inference offline edge inference. Clear boundaries make your explanation more credible.

## 14. Source references and further reading
Primary uploaded source: DeepLearing(1).pdf, six pages, supplied in this conversation. The paper analysis above refers to its proposal and reported citations; no new empirical claims were inferred from its title.

Dataset and grouping: https://github.com/spMohanty/PlantVillage-Dataset and its plant_village.py / leaf_grouping/leaf-map.json. Repository contents and mapping structure were inspected for the notebook design.

Original PlantVillage study: Mohanty, Hughes and Salathe, Using Deep Learning for Image-Based Plant Disease Detection, Frontiers in Plant Science (2016), DOI 10.3389/fpls.2016.01419. Read its external-image discussion before claiming field generalization.

Keras: https://keras.io/guides/training_with_built_in_methods/ and https://keras.io/api/callbacks/early_stopping/ for training and stopping concepts. This notebook implements persistent checkpoint/stopping state explicitly.

Camera: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia for secure contexts and permission behavior.

Deployment: https://nextjs.org/docs and https://vercel.com/docs/errors/function_payload_too_large for framework/deployment and request-body constraints.
