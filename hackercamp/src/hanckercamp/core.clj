(ns hanckercamp.core
  (:require
    [clojure.set]
    [clojure.data.csv :as csv]
    [clojure.java.io :as io]))

(def conversion
  {"milan@formanek.bio"          "milan.formanek@czechitas.cz"
   "info@tunasec.com"            "filip.holec@gmail.com"
   "lukaskrivka@gmail.com"       "lukas@apify.com"
   "ondrej@czechitas.cz"         "ondrej.cejka@czechitas.cz"
   "matolin.matej@gmail.com"     "matej@impulseventures.com"
   "vitek.jezek@rekola.cz"       "me@vitekjezek.com"
   "jiri.necas@productboard.com" "necas.jirik@gmail.com"
   "ales.roubicek@topmonks.com"  "ales@roubicek.name"})

(defn invoices-csv-data->maps [csv-data]
  (map zipmap
       (repeat
         [:timestamp :email :type :count :combination :people :company :address :VATID :invoice-text :contact :jahoda :invoice-date :amount :paid-amount :comment :sent])
       (rest csv-data)))

(defn contacts-csv-data->maps [csv-data]
  (map zipmap
       (repeat
         [:email :slack-id :name])
       (rest csv-data)))

(defn -main []
  (let [invoices
        (with-open [reader (io/reader "resources/invoices.csv")]
          (into [] (invoices-csv-data->maps (csv/read-csv reader))))
        contacts
        (with-open [reader (io/reader "resources/contacts.csv")]
          (into [] (contacts-csv-data->maps (csv/read-csv reader))))]
    (with-open [writer (io/writer "resources/import.csv")]
      (let [invoices (into {} (map #(vector (get conversion (:email %) (:email %)) %)) invoices)]
        (csv/write-csv
          writer
          (into
            []
            (comp
              (map #(merge % (select-keys (get invoices (:email %)) [:company :address :VATID])))
              (map vals))
            contacts))))))


