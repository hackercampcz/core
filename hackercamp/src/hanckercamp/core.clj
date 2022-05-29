(ns hanckercamp.core
  (:require
    [clojure.set]
    [clojure.data.csv :as csv]
    [clojure.data.json :as json]
    [clojure.java.io :as io]
    [clojure.string :as str]))

(def conversion
  {"milan@formanek.bio"          "milan.formanek@czechitas.cz"
   "info@tunasec.com"            "filip.holec@gmail.com"
   "lukaskrivka@gmail.com"       "lukas@apify.com"
   "ondrej@czechitas.cz"         "ondrej.cejka@czechitas.cz"
   "matolin.matej@gmail.com"     "matej@impulseventures.com"
   "vitek.jezek@rekola.cz"       "me@vitekjezek.com"
   "jiri.necas@productboard.com" "necas.jirik@gmail.com"
   "ales.roubicek@topmonks.com"  "ales@roubicek.name"})

(def conversions-regs
  {"filipsuk@gmail.com"       "filip@investown.cz"
   "sladek@contember.com"     "me@honzasladek.com"
   "info@tunasec.com"         "zember@gmail.com"
   "t.a.annamai@gmail.com"    "anna.mai@czechitas.cz"
   ;"jiri.opletal@gmail.com"   ""                            ;; asi má zaplaceno
   "filip.holec@tunasec.com"  "filip.holec@gmail.com"
   ;"ivan@appsatori.eu"        ""                            ;; asi loni nebyl
   "lucie.burisin@gmail.com"  "lucie@apify.com"
   "zbiejczuk@gmail.com"      "adam@influencer.cz"
   "matolin.matej@gmail.com"  "matej@impulseventures.com"
   "aadel.sykor@gmail.com"    "adela.sykorova@czechitas.cz"
   "vaclavkalous1@gmail.com"  "kalous@flatzone.cz"
   "dan@kessl.net"            "daniel.kessl@applifting.cz"
   "Tomas.severyn@gmail.com"  "tomas.severyn@gmail.com"
   ;  "vena.kubik@seznam.cz"     ""                            ;; asi loni nebyl
   ;"jakub@reframecircle.cz"   ""                            ;; asi loni nebyl
   "vojtech.toulec@gmail.com" "vojtech@toulec.cz"})

(defn invoices-csv-data->maps [csv-data]
  (map zipmap
       (repeat
         [:timestamp :email :type :count :combination :people :company :address :VATID :invoice-text :contact :jahoda :invoice-date :amount :paid-amount :comment :sent])
       (rest csv-data)))

(defn contacts-csv-data->maps [csv-data]
  (map zipmap
       (repeat
         [:email :slackID :name])
       (rest csv-data)))

(defn registrations-csv-data->maps [csv-data]
  (map zipmap
       (repeat
         [:timestamp
          :email
          :firstName
          :lastName
          :phone
          :company
          :type
          :plus-one-name
          :plus-one-email
          :plus-one-phone
          :plus-one-pitch
          :activity
          :binding-order
          :price
          :invoice
          :invoice-company
          :invoice-address
          :invoice-vatid
          :invoice-text
          :invoice-contact])
       (rest csv-data)))

(defn vatid [s]
  (let [match (re-find #"CZ\d+" s)]
    (when (some? match)
      match)))

(defn company-id [s]
  (let [match (re-find #"[^CZ]\d+" s)]
    (when (some? match)
      (str/trim match))))

(defn normalize-vatid [item]
  (assoc item
    :company (some-> (:company item) str/trim)
    :companyID (some-> (:VATID item) company-id)
    :address (some-> (:address item) str/trim)
    :vatID (some-> (:VATID item) vatid)))

(defn clean [m k k1 k2]
  (assoc m k (if (str/blank? (get m k1)) (get m k2) (get m k1))))

(defn ticket-type [s]
  (case s
    "5.000 CZK - Hacker = Normální vstupné" "hacker"
    "7.500 CZK - Hacker, co má zlaté srdce = Normální vstupné + příspěvek na vstupné pro neziskové organizace a studenty" "hacker-plus"
    "Patron campu = Chci podpořit neziskovku i vás, protože chci podobnou akci i za rok. Přispěju vyšší částkou (nad 7.500 CZK, částku uveďte níže)" "hacker-patron"
    "nonprofit"))

(defn import-registration [item]
  (let [[first-name last-name] (str/split (:plus-one-name item) #"\s")]
    (into
      {}
      (remove (fn [[key val]] (or (nil? val) (and (string? val) (str/blank? val)))))
      (->
        item
        (assoc
          :ticketType (some-> item :price ticket-type)
          :firstTime false
          :year 2022
          :plusFirstName first-name
          :plusLastName last-name
          :plusEmail (:plus-one-email item)
          :plusPhone (:plus-one-phone item)
          :plusReason (:plus-one-pitch item))
        (dissoc :plus-one-name :plus-one-email :plus-one-phone :plus-one-pitch :price)))))

(defn -main []
  (let [invoices
        (with-open [reader (io/reader "resources/invoices.csv")]
          (into [] (map normalize-vatid) (invoices-csv-data->maps (csv/read-csv reader))))
        contacts
        (with-open [reader (io/reader "resources/contacts.csv")]
          (into [] (contacts-csv-data->maps (csv/read-csv reader))))
        invoices-reg
        (into {} (map #(vector (get conversions-regs (:email %) (:email %)) %) invoices))
        invoices
        (into {} (map #(vector (get conversion (:email %) (:email %)) %)) invoices)
        contacts
        (into
          []
          (comp
            (map #(merge % (select-keys (get invoices (:email %)) [:company :companyID :vatID :address])))
            (map #(assoc % :email (-> % :email str/lower-case)))
            (map #(if (nil? (:vatID %)) (dissoc % :vatID) %))
            (map #(if (nil? (:companyID %)) (dissoc % :companyID) %))
            (map #(if (str/blank? (:company %)) (dissoc % :company) %))
            (map #(if (= (:name %) (:company %)) (dissoc % :company) %))
            (map #(if (str/blank? (:address %)) (dissoc % :address) %)))
          contacts)
        registrations
        (with-open [reader (io/reader "resources/registrace2022.csv")]
          (into [] (registrations-csv-data->maps (csv/read-csv reader))))]
    (with-open [writer (io/writer "resources/import-contacts.json")]
      (json/write contacts writer :escape-unicode false))
    (let [reg (into #{} (map :email) registrations)
          contacts (into #{} (map :email) contacts)]
      #_(clojure.pprint/pprint
          {:reg          reg
           :contacts     contacts
           :diff         (clojure.set/difference reg contacts)
           :intersection (clojure.set/intersection reg contacts)
           :count        (count (clojure.set/intersection reg contacts))}))
    (with-open [writer (io/writer "resources/import-registrations.json")]
      (json/write
        (into
          []
          (comp
            (map #(assoc % :invoice-vatid (some-> % :invoice-vatid vatid)))
            (map #(assoc % :invoice-regNo (some-> % :invoice-vatid company-id)))
            (map #(merge (select-keys (get invoices-reg (:email %)) [:company :VATID :address]) %))
            (map #(if (nil? (:invoice-vatid %)) (assoc % :invoice-vatid (some-> % :VATID vatid)) %))
            (map #(if (nil? (:invoice-regNo %)) (assoc % :invoice-regNo (some-> % :VATID company-id)) %))
            #_(map #(select-keys % [:firstname :surname :company :VATID :type :invoice-vatid :address :invoice :invoice-company :invoice-address :invoice-vatid :invoice-text :invoice-contact]))
            (map #(clean % :invAddress :invoice-address :address))
            (map #(clean % :invVatNo :invoice-vatid :VATID))
            (map #(clean % :invRegNo :invoice-regNo :companyID))
            (map #(clean % :invName :invoice-company :company))
            (map import-registration)
            (map #(dissoc % :invoice-address :invoice-regNo :VATID :invoice-vatid :invoice-company :invoice-text :invoice :type :timestamp :binding-order))
            #_(filter #(or (some? (:VATID %)) (some? (:invoice-vatid %)))))
          registrations)
        writer :escape-unicode false))))


